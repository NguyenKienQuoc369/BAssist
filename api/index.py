from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import google.generativeai as genai
import os
from typing import Optional, List, Dict
import PyPDF2
import io
import json
import mimetypes
import pickle
from pathlib import Path
from datetime import datetime
import uuid
import hashlib
import importlib
from contextlib import contextmanager

# psycopg2 is optional; if missing we fall back to file storage
try:
    psycopg2 = importlib.import_module("psycopg2")
    Json = importlib.import_module("psycopg2.extras").Json
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    psycopg2 = None  # type: ignore
    Json = None  # type: ignore
    print("[WARNING] psycopg2 not installed; database mode disabled. Install psycopg2-binary to enable.")

# Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.md', '.docx', '.jpg', '.jpeg', '.png'}

# Database Configuration (Vercel-compatible)
DATABASE_URL = os.getenv("DATABASE_URL") if PSYCOPG2_AVAILABLE else None

# Fallback to file-based storage if no database URL or driver is provided
USE_DATABASE = bool(DATABASE_URL) and PSYCOPG2_AVAILABLE
if not USE_DATABASE:
    CONVERSATION_STORAGE_DIR = Path("./conversation_memory")
    CONVERSATION_STORAGE_DIR.mkdir(exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="BAssist AI API")

# Health check endpoint
@app.get("/api/health")
async def health():
    return {"success": True, "status": "ok"}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)

# Pydantic models for request validation
class TextRequest(BaseModel):
    text: str

class QuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None

class DocumentRequest(BaseModel):
    text: str
    query: Optional[str] = None

# Helper function to extract text from files
async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text content from uploaded files with validation"""
    try:
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File quá lớn. Tối đa {MAX_FILE_SIZE / 1024 / 1024}MB")
        
        filename = file.filename.lower()
        ext = Path(filename).suffix
        
        # Validate extension
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Định dạng file không được hỗ trợ: {ext}")
        
        # PDF files
        if ext == '.pdf':
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        
        # Text files
        elif ext in ('.txt', '.md', '.docx'):
            return content.decode('utf-8', errors='ignore')
        
        # Image files
        elif ext in ('.jpg', '.jpeg', '.png'):
            return f"[Tệp hình ảnh: {filename}]"
        
        # Default: try to decode as text
        else:
            return content.decode('utf-8', errors='ignore')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc tệp: {str(e)}")

# Helper functions for context and prompt building

# ==================== Database Connection ====================

@contextmanager
def get_db_connection():
    """Get database connection (works on Vercel)"""
    if not USE_DATABASE or not psycopg2:
        # Explicitly yield None so callers can gracefully fall back to file storage
        yield None
        return

    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require' if DATABASE_URL and 'vercel' in DATABASE_URL else 'disable')
        yield conn
        conn.close()
    except Exception as e:
        print(f"[WARNING] Database connection failed: {e}")
        # Yield None so callers can choose file fallback instead of crashing
        yield None
        yield None

def init_database():
    """Initialize database tables"""
    try:
        with get_db_connection() as conn:
            if conn:
                cursor = conn.cursor()
                
                # Sessions table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS conversation_sessions (
                        session_id VARCHAR(255) PRIMARY KEY,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        message_count INTEGER DEFAULT 0
                    )
                ''')
                
                # Messages table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS conversation_messages (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL,
                        role VARCHAR(20),
                        content TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        kb_name VARCHAR(255),
                        FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE
                    )
                ''')
                
                # AI Memory table (stores extracted user info: name, preferences, facts)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ai_user_memory (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL,
                        memory_key VARCHAR(255),
                        memory_value TEXT,
                        memory_type VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id) ON DELETE CASCADE,
                        UNIQUE(session_id, memory_key)
                    )
                ''')
                
                # Indexes
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_session_id ON conversation_messages(session_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON conversation_messages(timestamp)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_ai_memory_session ON ai_user_memory(session_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_user_memory(memory_type)')
                
                conn.commit()
                print("[INFO] Database tables initialized")
    except Exception as e:
        print(f"[WARNING] Database init failed (will try fallback): {e}")

# Initialize database on startup
if USE_DATABASE:
    init_database()

# ==================== Conversation Memory System (Database-backed) ====================

class ConversationMemory:
    """Persistent conversation memory with database backend"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.conversations: List[Dict] = []
        if USE_DATABASE:
            self._init_session()
            self.load_memory()
        else:
            # Fallback to file-based
            self.memory_file = CONVERSATION_STORAGE_DIR / f"user_{user_id}.json"
            self.load_memory()
    
    def _init_session(self):
        """Initialize session in database"""
        try:
            with get_db_connection() as conn:
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO conversation_sessions (session_id, updated_at)
                        VALUES (%s, CURRENT_TIMESTAMP)
                        ON CONFLICT (session_id) DO UPDATE
                        SET updated_at = CURRENT_TIMESTAMP
                    ''', (self.user_id,))
                    conn.commit()
        except Exception as e:
            print(f"[WARNING] Session init failed: {e}")
    
    def load_memory(self):
        """Load conversation history from database or file"""
        try:
            if USE_DATABASE:
                with get_db_connection() as conn:
                    if conn:
                        cursor = conn.cursor()
                        cursor.execute('''
                            SELECT role, content, timestamp, kb_name 
                            FROM conversation_messages 
                            WHERE session_id = %s 
                            ORDER BY timestamp ASC
                        ''', (self.user_id,))
                        rows = cursor.fetchall()
                        self.conversations = [
                            {
                                "role": row[0],
                                "content": row[1],
                                "timestamp": row[2].isoformat() if row[2] else None,
                                "kb": row[3]
                            }
                            for row in rows
                        ]
                        print(f"[INFO] Loaded {len(self.conversations)} messages for user {self.user_id}")
                    else:
                        self._load_from_file()
            else:
                self._load_from_file()
        except Exception as e:
            print(f"[ERROR] Failed to load memory: {e}")
            self.conversations = []
    
    def _load_from_file(self):
        """Fallback: Load from file"""
        try:
            if self.memory_file.exists():
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.conversations = data.get("conversations", [])
        except Exception as e:
            print(f"[WARNING] Failed to load from file: {e}")
            self.conversations = []
    
    def save_memory(self):
        """Save conversation to database or file"""
        try:
            if USE_DATABASE:
                with get_db_connection() as conn:
                    if conn:
                        cursor = conn.cursor()
                        cursor.execute(
                            'UPDATE conversation_sessions SET updated_at = CURRENT_TIMESTAMP, message_count = %s WHERE session_id = %s',
                            (len(self.conversations), self.user_id)
                        )
                        conn.commit()
                    else:
                        self._save_to_file()
            else:
                self._save_to_file()
        except Exception as e:
            print(f"[WARNING] Failed to save memory: {e}")
            self._save_to_file()
    
    def _save_to_file(self):
        """Fallback: Save to file"""
        try:
            with open(self.memory_file, "w", encoding="utf-8") as f:
                json.dump({
                    "user_id": self.user_id,
                    "updated_at": datetime.now().isoformat(),
                    "conversations": self.conversations
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[ERROR] Failed to save to file: {e}")
    
    def add_message(self, role: str, content: str, kb_name: Optional[str] = None):
        """Add message to history"""
        try:
            timestamp = datetime.now()
            msg = {
                "role": role,
                "content": content,
                "timestamp": timestamp.isoformat(),
                "kb": kb_name
            }
            
            if USE_DATABASE:
                with get_db_connection() as conn:
                    if conn:
                        cursor = conn.cursor()
                        cursor.execute('''
                            INSERT INTO conversation_messages (session_id, role, content, timestamp, kb_name)
                            VALUES (%s, %s, %s, %s, %s)
                        ''', (self.user_id, role, content, timestamp, kb_name))
                        conn.commit()
                    else:
                        self.conversations.append(msg)
                        self._save_to_file()
            else:
                self.conversations.append(msg)
                self._save_to_file()
            
            self.conversations.append(msg)
            self.save_memory()
        except Exception as e:
            print(f"[WARNING] Failed to add message: {e}")
            self.conversations.append(msg)
            self._save_to_file()
    
    def get_recent_context(self, max_messages: int = 15) -> str:
        """Get recent context for prompt"""
        if not self.conversations:
            return ""
        
        context = "📝 LỊCH SỬ CUỘC TRÒ CHUYỆN GẦN ĐÂY:\n"
        for msg in self.conversations[-max_messages:]:
            role = "👤 Bạn" if msg["role"] == "user" else "🤖 AI"
            content = msg["content"][:300]
            context += f"{role}: {content}\n\n"
        
        return context
    
    def get_all_messages(self) -> List[Dict]:
        """Get all messages"""
        return self.conversations

conversation_memories: Dict[str, ConversationMemory] = {}

async def get_memory(session_id: Optional[str]) -> ConversationMemory:
    """Get or create conversation memory for a session"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in conversation_memories:
        conversation_memories[session_id] = ConversationMemory(session_id)
    
    return conversation_memories[session_id]

# ==================== AI User Memory Functions ====================

async def save_ai_memory(session_id: str, key: str, value: str, memory_type: str = "user_info"):
    """Save extracted AI memory (name, preferences, etc.)"""
    try:
        if USE_DATABASE:
            with get_db_connection() as conn:
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO ai_user_memory (session_id, memory_key, memory_value, memory_type, updated_at)
                        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (session_id, memory_key) 
                        DO UPDATE SET memory_value = EXCLUDED.memory_value, updated_at = CURRENT_TIMESTAMP
                    ''', (session_id, key, value, memory_type))
                    conn.commit()
                    print(f"[INFO] Saved AI memory: {key} for {session_id}")
    except Exception as e:
        print(f"[WARNING] Failed to save AI memory: {e}")

async def get_ai_memory(session_id: str) -> Dict[str, str]:
    """Get all AI memories for a session"""
    try:
        if USE_DATABASE:
            with get_db_connection() as conn:
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT memory_key, memory_value, memory_type 
                        FROM ai_user_memory 
                        WHERE session_id = %s
                        ORDER BY updated_at DESC
                    ''', (session_id,))
                    rows = cursor.fetchall()
                    return {row[0]: row[1] for row in rows}
        return {}
    except Exception as e:
        print(f"[WARNING] Failed to get AI memory: {e}")
        return {}

async def get_ai_memory_context(session_id: str) -> str:
    """Build AI memory context for prompts"""
    memories = await get_ai_memory(session_id)
    if not memories:
        return ""
    
    context = "\n🧠 THÔNG TIN ĐÃ GHI NHỚ VỀ NGƯỜI DÙNG:\n"
    for key, value in memories.items():
        context += f"  • {key}: {value}\n"
    context += "\n"
    return context

async def get_kb_context(kb_name: Optional[str], user_query: str) -> str:
    """Build knowledge base context for AI"""
    if not kb_name:
        return ""
    
    kb = kb_manager.get_kb(kb_name)
    if not kb or not kb.documents:
        return ""
    
    relevant_docs = kb.query(user_query, top_k=3)
    if not relevant_docs:
        return ""
    
    kb_context = "\n\n" + "="*80 + "\n"
    kb_context += "📚 TÀI LIỆU TỪ KHO DỮ LIỆU CỦA BẠN\n"
    kb_context += "="*80 + "\n"
    kb_context += "Bạn đã tải lên các tài liệu vào kho dữ liệu.\n"
    kb_context += "Đây là nội dung TEXT từ những tệp đó:\n\n"
    
    for i, doc in enumerate(relevant_docs, 1):
        kb_context += f"--- TÀI LIỆU {i} ---\n"
        kb_context += doc[:2000] + ("..." if len(doc) > 2000 else "") + "\n\n"
    
    kb_context += "="*80 + "\n"
    kb_context += "⚠️ BẠN CÓ QUYỀN TRUY CẬP vào nội dung trên. Hãy sử dụng nó để trả lời!\n"
    kb_context += "="*80 + "\n\n"
    
    return kb_context

def build_conversation_context(history: List[Dict], max_messages: int = 10) -> str:
    """Build conversation history context"""
    if not history:
        return ""
    
    context = "📝 LỊCH SỬ CUỘC TRÒ CHUYỆN:\n"
    for msg in history[-max_messages:]:
        role = "👤 Bạn" if msg.get("role") == "user" else "🤖 AI"
        content = msg.get('content', '')[:500]  # Limit length
        context += f"{role}: {content}\n\n"
    
    return context

# Multi-Knowledge Base System
class KnowledgeBase:
    """Single knowledge base instance"""
    def __init__(self, name: str):
        self.name = name
        self.documents = []  # List of dicts with {id, text, filename, uploaded_at}
        self.created_at = None
        self.next_id = 0
    
    def add_document(self, text: str, filename: str = ""):
        """Add document to this knowledge base"""
        doc = {
            "id": self.next_id,
            "text": text,
            "filename": filename,
            "uploaded_at": None  # Could add timestamp if needed
        }
        self.documents.append(doc)
        self.next_id += 1
        return doc["id"]
    
    def remove_document(self, doc_id: int) -> bool:
        """Remove a document by ID"""
        for i, doc in enumerate(self.documents):
            if doc["id"] == doc_id:
                self.documents.pop(i)
                return True
        return False
    
    def get_document(self, doc_id: int):
        """Get a document by ID"""
        for doc in self.documents:
            if doc["id"] == doc_id:
                return doc
        return None
    
    def query(self, query_text: str, top_k: int = 3) -> List[str]:
        """Retrieve relevant documents from this KB"""
        # Simple approach: return top_k documents
        # In production, use proper embeddings and semantic search
        if not self.documents:
            return []
        return [doc["text"] for doc in self.documents[:min(top_k, len(self.documents))]]
    
    def clear(self):
        """Clear all documents from this knowledge base"""
        self.documents = []
        self.next_id = 0

class KnowledgeBaseManager:
    """Manage multiple knowledge bases"""
    KB_STORAGE_FILE = "kb_storage.pkl"
    
    def __init__(self):
        self.knowledge_bases: Dict[str, KnowledgeBase] = {}
        self.load_from_disk()
    
    def save_to_disk(self):
        """Save all KBs to disk"""
        try:
            with open(self.KB_STORAGE_FILE, "wb") as f:
                pickle.dump(self.knowledge_bases, f)
            print(f"[INFO] Saved {len(self.knowledge_bases)} KBs to disk")
        except Exception as e:
            print(f"[ERROR] Failed to save KBs: {e}")
    
    def load_from_disk(self):
        """Load KBs from disk"""
        try:
            if Path(self.KB_STORAGE_FILE).exists():
                with open(self.KB_STORAGE_FILE, "rb") as f:
                    self.knowledge_bases = pickle.load(f)
                print(f"[INFO] Loaded {len(self.knowledge_bases)} KBs from disk")
            else:
                print("[INFO] No KB storage file found, starting fresh")
        except Exception as e:
            print(f"[ERROR] Failed to load KBs: {e}")
            self.knowledge_bases = {}
    
    def create_kb(self, name: str) -> KnowledgeBase:
        """Create new knowledge base"""
        if name in self.knowledge_bases:
            return self.knowledge_bases[name]
        kb = KnowledgeBase(name)
        self.knowledge_bases[name] = kb
        self.save_to_disk()
        return kb
    
    def get_kb(self, name: str) -> Optional[KnowledgeBase]:
        """Get knowledge base by name"""
        return self.knowledge_bases.get(name)
    
    def list_kbs(self) -> List[dict]:
        """List all knowledge bases"""
        return [
            {
                "name": name,
                "document_count": len(kb.documents)
            }
            for name, kb in self.knowledge_bases.items()
        ]
    
    def delete_kb(self, name: str) -> bool:
        """Delete knowledge base"""
        if name in self.knowledge_bases:
            del self.knowledge_bases[name]
            self.save_to_disk()
            return True
        return False

# Initialize knowledge base manager
kb_manager = KnowledgeBaseManager()
# Create default knowledge base for Subject Vault
kb_manager.create_kb("default")

@app.get("/")
async def root():
    return {
        "message": "Consul AI API is running",
        "version": "1.0.0",
        "endpoints": [
            "/api/study-buddy",
            "/api/polisher",
            "/api/fact-check",
            "/api/chat",
            "/api/personal-doctor",
            "/api/knowledge-bases/create",
            "/api/knowledge-bases/delete",
            "/api/knowledge-bases/clear",
            "/api/knowledge-bases"
        ]
    }

@app.post("/api/study-buddy")
async def study_buddy(files: List[UploadFile] = File(None), request: str = Form(None)):
    """
    Summarize and explain content - Vietnamese optimized
    """
    try:
        text = ""
        kb_name = None
        
        if files and len(files) > 0 and files[0] and files[0].filename:
            file_texts = []
            for file in files:
                if file and file.filename:
                    file_text = await extract_text_from_file(file)
                    file_texts.append(file_text)
            text = "\n\n".join(file_texts)
        elif request:
            try:
                request_data = json.loads(request)
                text = request_data.get("text", "")
                kb_name = request_data.get("knowledge_base")
            except:
                text = request
        
        if not text:
            raise HTTPException(status_code=400, detail="Vui lòng cung cấp nội dung hoặc tải lên tệp")
        
        kb_context = await get_kb_context(kb_name, text)
        
        prompt = f"""🎓 BẠN LÀ TRỢ LÝ HỌC TẬP THÔNG MINH

NHIỆM VỤ: Tóm tắt và giải thích nội dung sau bằng tiếng Việt:

{kb_context if kb_context else ""}
📖 NỘI DUNG:
{text}

YÊUẨU ĐỊNH DẠNG TÓM TẮT:
1. 📌 3-5 ĐIỂM CHÍNH
2. 🔑 KHÁI NIỆM QUAN TRỌNG
3. 💡 Ứng dụng thực tế
4. ⚠️ Điểm dễ nhầm lẫn

Hãy trả lời bằng tiếng Việt rõ ràng, dễ hiểu:"""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "summary": response.text,
            "has_kb": bool(kb_context)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Study-buddy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi tóm tắt: {str(e)}")

@app.post("/api/polisher")
async def polisher(files: List[UploadFile] = File(None), request: str = Form(None)):
    """
    Improve text for professional/academic use - Vietnamese optimized
    """
    try:
        text = ""
        kb_name = None
        
        if files and len(files) > 0 and files[0] and files[0].filename:
            file_texts = []
            for file in files:
                if file and file.filename:
                    file_text = await extract_text_from_file(file)
                    file_texts.append(file_text)
            text = "\n\n".join(file_texts)
        elif request:
            try:
                request_data = json.loads(request)
                text = request_data.get("text", "")
                kb_name = request_data.get("knowledge_base")
            except:
                text = request
        
        if not text:
            raise HTTPException(status_code=400, detail="Vui lòng cung cấp nội dung hoặc tải lên tệp")
        
        kb_context = await get_kb_context(kb_name, text)
        
        prompt = f"""✨ BẠN LÀ CHUYÊN GIA SỬA CHỮ VĂN BẢN CHUYÊN NGHIỆP

NHIỆM VỤ: Nâng cao chất lượng bản văn sau bằng tiếng Việt:

{kb_context if kb_context else ""}
📝 VĂN BẢN GỐC:
{text}

HƯỚNG DẪN:
✅ Cải thiện từ vựng, ngữ pháp, cấu trúc câu
✅ Giữ ý tứ gốc nhưng làm rõ hơn
✅ Tăng tính chuyên nghiệp và thuyết phục
✅ Loại bỏ lặp từ, phát biểu lủng lẳng
❌ KHÔNG thay đổi ý chính
❌ KHÔNG thêm nội dung mới ngoài yêu cầu

Hãy viết lại bản văn nâng cao:"""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "original": text,
            "polished": response.text,
            "has_kb": bool(kb_context)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Polisher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi trau chuốt: {str(e)}")

@app.post("/api/fact-check")
async def fact_check(files: List[UploadFile] = File(None), request: str = Form(None)):
    """
    Verify information using Gemini with Google Search Grounding
    """
    try:
        # Get text from either request body or uploaded files
        text = ""
        if files and len(files) > 0 and files[0] and files[0].filename:
            # Process multiple files
            file_texts = []
            for file in files:
                if file and file.filename:
                    file_text = await extract_text_from_file(file)
                    file_texts.append(f"--- {file.filename} ---\n{file_text}")
            text = "\n\n".join(file_texts)
        elif request:
            # Parse JSON string if it's a stringified object
            try:
                import json
                request_data = json.loads(request)
                text = request_data.get("text", "")
            except:
                text = request
        else:
            raise HTTPException(status_code=400, detail="Please provide text or upload files")
        
        # Use Gemini with Google Search grounding
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            tools='google_search_retrieval'
        )
        
        prompt = f"""🔎 Hãy KIỂM CHỨNG độ chính xác của phát biểu sau (trả lời bằng TIẾNG VIỆT).
    YÊU CẦU:
    1) Kết luận: ĐÚNG / SAI / MỘT PHẦN ĐÚNG / KHÔNG XÁC THỰC
    2) Bằng chứng/sources (nêu rõ nếu do Google Search gợi ý)
    3) Bối cảnh/ngoại lệ quan trọng

    Phát biểu cần kiểm chứng:
    {text}

    Phân tích kiểm chứng:"""
        
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "claim": text,
            "fact_check_result": response.text
        }
    except Exception as e:
        # Fallback if search grounding is not available
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""Hãy phân tích độ chính xác của phát biểu sau (tiếng Việt). 
Lưu ý: đây là phân tích dựa trên kiến thức mô hình, KHÔNG phải tìm kiếm thời gian thực.

Phát biểu:
{text}

Phân tích:"""
            
            response = model.generate_content(prompt)
            
            return {
                "success": True,
                "claim": text,
                "fact_check_result": response.text,
                "note": "This analysis is based on training data, not real-time search."
            }
        except Exception as fallback_error:
            raise HTTPException(status_code=500, detail=f"Error fact-checking: {str(fallback_error)}")

@app.post("/api/chat")
async def chat(files: List[UploadFile] = File(None), request: str = Form(None)):
    """
    General chat conversation with persistent memory:
    - Persistent conversation memory per user
    - Vietnamese language support
    - Knowledge base integration
    - Semantic memory extraction
    """
    try:
        # Parse request safely
        text = ""
        history = []
        kb_name = None
        session_id = None
        
        if request:
            try:
                request_data = json.loads(request)
                text = request_data.get("text", "").strip()
                history = request_data.get("history", [])
                kb_name = request_data.get("knowledge_base")
                session_id = request_data.get("session_id")
            except Exception as parse_error:
                text = request.strip()
                print(f"[WARNING] Failed to parse chat request JSON, using raw text. Error: {parse_error}")
        
        # Get or create persistent memory for this session
        memory = await get_memory(session_id)
        
        # Process uploaded files
        file_context = ""
        if files and len(files) > 0 and files[0] and files[0].filename:
            file_texts = []
            for file in files:
                if file and file.filename:
                    file_text = await extract_text_from_file(file)
                    file_texts.append(f"📄 Tệp '{file.filename}':\n{file_text}")
            file_context = "\n\n".join(file_texts)
        
        if not text and not file_context:
            raise HTTPException(status_code=400, detail="Vui lòng nhập tin nhắn hoặc tải lên tệp")
        
        # Build context - use persistent memory + recent history
        conversation_context = build_conversation_context(history, max_messages=12)
        persistent_context = memory.get_recent_context(max_messages=10)
        kb_context = await get_kb_context(kb_name, text)
        
        # Build improved prompt with Vietnamese support and persistent memory
        system_prompt = """Bạn là một trợ lý AI thông minh, tử tế và có khả năng thấu hiểu.

HƯỚNG DẪN QUAN TRỌNG:
1. 🗣️ Luôn trả lời bằng TIẾNG VIỆT tự nhiên và dễ hiểu
2. 💭 Thấu hiểu ý định của người dùng, hỏi làm rõ nếu cần
3. 📚 Nếu có KHO DỮ LIỆU, hãy ưu tiên sử dụng nó để trả lời
4. 🧠 GHI NHỚ: Bạn có bộ nhớ liên tục từ các cuộc trò chuyện trước
5. ❌ KHÔNG nói "Tôi không thể truy cập" - bạn CÓ các tệp ở trên!
6. 📝 Trả lời súc tích nhưng đầy đủ thông tin"""
        
        user_message = f"""Tin nhắn của người dùng: {text}"""
        
        if file_context:
            user_message += f"\n\n📎 Nội dung tệp đính kèm:\n{file_context}"
        
        if kb_context:
            user_message += f"\n{kb_context}"
        
        # Combine memory contexts - persistent first, then recent
        if persistent_context or conversation_context:
            memory_section = ""
            if persistent_context:
                memory_section += persistent_context
            if conversation_context:
                memory_section += conversation_context
            user_message = f"{memory_section}\n{user_message}"
        
        full_prompt = f"""{system_prompt}

{user_message}

Trả lời của bạn:"""
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(full_prompt)
        
        # Save to persistent memory
        memory.add_message("user", text, kb_name)
        memory.add_message("assistant", response.text, kb_name)
        
        return {
            "success": True,
            "response": response.text,
            "has_kb": bool(kb_context),
            "has_files": bool(file_context),
            "session_id": memory.user_id,
            "memory_messages": len(memory.conversations)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Chat endpoint: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"success": False, "detail": f"Lỗi trong chat: {str(e)}"}
        )

@app.post("/api/personal-doctor")
async def personal_doctor(
    files: List[UploadFile] = File(None),
    request: str = Form(None),
):
    """Personal doctor endpoint - provide health advice and recommendations"""
    try:
        text_content = ""
        kb_name = None
        
        # Process uploaded files
        if files and len(files) > 0 and files[0] and files[0].filename:
            for file in files:
                extracted = await extract_text_from_file(file)
                if extracted:
                    text_content += f"\n[From {file.filename}]\n{extracted}\n"
        
        # Parse request JSON
        if request:
            request_data = json.loads(request)
            user_text = request_data.get("text", "")
            kb_name = request_data.get("knowledge_base")
            if user_text:
                text_content += user_text
        
        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Please provide health information")
        
        # Get knowledge base context if specified
        kb_context = ""
        if kb_name:
            kb = kb_manager.get_kb(kb_name)
            if kb and kb.documents:
                relevant_docs = kb.query(text_content, top_k=3)
                if relevant_docs:
                    kb_context = "\n\n=== MEDICAL REFERENCE MATERIALS FROM KNOWLEDGE BASE ===\n"
                    kb_context += "Use these medical documents as reference for your advice:\n\n"
                    for i, doc in enumerate(relevant_docs, 1):
                        kb_context += f"--- Medical Reference {i} ---\n{doc}\n\n"
                    kb_context += "=== END OF MEDICAL REFERENCES ===\n\n"
        
        # Create prompt for personal doctor AI
        prompt = f"""Bạn là trợ lý sức khỏe & dinh dưỡng (trả lời TIẾNG VIỆT), đưa ra gợi ý dựa trên bằng chứng.
    HƯỚNG DẪN:
    - Nhấn mạnh: vấn đề nghiêm trọng cần bác sĩ thăm khám trực tiếp.
    - Đưa lời khuyên phòng ngừa, lối sống, dinh dưỡng, vận động, giấc ngủ, tinh thần.
    - Đồng cảm, tránh chẩn đoán chắc chắn; gợi ý gặp chuyên gia khi cần.
    - Đưa khuyến nghị cụ thể, dễ làm; ưu tiên an toàn.
    {kb_context}

    Thông tin/ câu hỏi của người dùng:
    {text_content}

    Vui lòng đưa ra tư vấn ngắn gọn, dễ hiểu, có gạch đầu dòng nếu cần."""

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "advice": response.text
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in personal-doctor endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error in personal doctor: {str(e)}")

# ==================== Knowledge Base Management Endpoints ====================

@app.get("/api/knowledge-bases")
async def list_knowledge_bases():
    """List all available knowledge bases"""
    try:
        kbs = kb_manager.list_kbs()
        return {
            "success": True,
            "knowledge_bases": kbs,
            "total": len(kbs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing knowledge bases: {str(e)}")

class CreateKBRequest(BaseModel):
    name: str

@app.post("/api/knowledge-bases/create")
async def create_knowledge_base(kb_request: CreateKBRequest):
    """Create a new knowledge base"""
    try:
        kb_name = kb_request.name.strip()
        
        if not kb_name:
            raise HTTPException(status_code=400, detail="Knowledge base name cannot be empty")
        
        kb = kb_manager.create_kb(kb_name)
        
        return {
            "success": True,
            "message": f"Knowledge base '{kb_name}' created",
            "kb_name": kb_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating knowledge base: {str(e)}")

@app.post("/api/knowledge-bases/delete")
async def delete_knowledge_base(request: str = Form(None)):
    """Delete a knowledge base"""
    try:
        if not request:
            raise HTTPException(status_code=400, detail="Please provide knowledge base name")
        
        request_data = json.loads(request)
        kb_name = request_data.get("name", "").strip()
        
        if not kb_name:
            raise HTTPException(status_code=400, detail="Knowledge base name cannot be empty")
        
        if kb_manager.delete_kb(kb_name):
            return {
                "success": True,
                "message": f"Knowledge base '{kb_name}' deleted"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting knowledge base: {str(e)}")

@app.post("/api/knowledge-bases/clear")
async def clear_knowledge_base(request: str = Form(None)):
    """Clear all documents from a knowledge base"""
    try:
        if not request:
            raise HTTPException(status_code=400, detail="Please provide knowledge base name")
        
        request_data = json.loads(request)
        kb_name = request_data.get("name", "").strip()
        
        kb = kb_manager.get_kb(kb_name)
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
        
        kb.clear()
        kb_manager.save_to_disk()
        
        return {
            "success": True,
            "message": f"Knowledge base '{kb_name}' cleared"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing knowledge base: {str(e)}")

@app.post("/api/knowledge-bases/upload")
async def upload_to_knowledge_base(
    files: List[UploadFile] = File(None),
    request: str = Form(None)
):
    """Upload documents to a knowledge base"""
    try:
        if not request:
            raise HTTPException(status_code=400, detail="Please provide knowledge base name")
        
        request_data = json.loads(request)
        kb_name = request_data.get("name", "").strip()
        
        if not kb_name:
            raise HTTPException(status_code=400, detail="Knowledge base name cannot be empty")
        
        kb = kb_manager.get_kb(kb_name)
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
        
        if not files or len(files) == 0 or not files[0].filename:
            raise HTTPException(status_code=400, detail="Please upload at least one file")
        
        # Extract text from files and add to knowledge base
        uploaded_count = 0
        for file in files:
            if file and file.filename:
                try:
                    text = await extract_text_from_file(file)
                    if text and text.strip():
                        kb.add_document(text, filename=file.filename)
                        uploaded_count += 1
                except Exception as e:
                    print(f"Error processing file {file.filename}: {str(e)}")
                    continue
        
        if uploaded_count == 0:
            raise HTTPException(status_code=400, detail="No valid documents were uploaded")
        
        # Save to disk after upload
        kb_manager.save_to_disk()
        
        return {
            "success": True,
            "message": f"Uploaded {uploaded_count} document(s) to '{kb_name}'",
            "uploaded_count": uploaded_count,
            "total_documents": len(kb.documents)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in upload endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error uploading to knowledge base: {str(e)}")

@app.get("/api/knowledge-bases/{kb_name}/documents")
async def get_knowledge_base_documents(kb_name: str):
    """Get all documents in a knowledge base"""
    try:
        kb = kb_manager.get_kb(kb_name)
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
        
        # Return document list with metadata (without full text for performance)
        docs = [{
            "id": doc["id"],
            "filename": doc["filename"],
            "text_preview": doc["text"][:200] + "..." if len(doc["text"]) > 200 else doc["text"],
            "text_length": len(doc["text"])
        } for doc in kb.documents]
        
        return {
            "success": True,
            "kb_name": kb_name,
            "documents": docs,
            "total": len(docs)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting documents: {str(e)}")

@app.post("/api/knowledge-bases/{kb_name}/documents/{doc_id}")
async def delete_document(kb_name: str, doc_id: int):
    """Delete a specific document from knowledge base"""
    try:
        kb = kb_manager.get_kb(kb_name)
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
        
        if kb.remove_document(doc_id):
            return {
                "success": True,
                "message": "Document deleted"
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@app.get("/api/knowledge-bases/{kb_name}/documents/{doc_id}")
async def get_document(kb_name: str, doc_id: int):
    """Get full document content"""
    try:
        kb = kb_manager.get_kb(kb_name)
        if not kb:
            raise HTTPException(status_code=404, detail=f"Knowledge base '{kb_name}' not found")
        
        doc = kb.get_document(doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "success": True,
            "document": doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting document: {str(e)}")

# ==================== Conversation Memory Endpoints ====================

@app.get("/api/memory/{session_id}")
async def get_memory_endpoint(session_id: str):
    """Retrieve conversation history for a session"""
    try:
        memory = await get_memory(session_id)
        messages = memory.get_all_messages()
        
        return {
            "success": True,
            "session_id": session_id,
            "message_count": len(messages),
            "messages": messages,
            "updated_at": memory.memory_file.stat().st_mtime if memory.memory_file.exists() else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy lịch sử: {str(e)}")

@app.delete("/api/memory/{session_id}")
async def delete_memory_endpoint(session_id: str):
    """Clear conversation memory for a session (chat history only)"""
    try:
        memory = await get_memory(session_id)
        
        # Delete from database
        if USE_DATABASE:
            with get_db_connection() as conn:
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('DELETE FROM conversation_messages WHERE session_id = %s', (session_id,))
                    cursor.execute('DELETE FROM conversation_sessions WHERE session_id = %s', (session_id,))
                    conn.commit()
        
        # Delete file if exists
        if hasattr(memory, 'memory_file') and memory.memory_file and memory.memory_file.exists():
            memory.memory_file.unlink()
        
        # Clear in-memory conversations
        memory.conversations = []
        
        # Remove from cache
        if session_id in conversation_memories:
            del conversation_memories[session_id]
        
        return {
            "success": True,
            "message": f"✅ Đã xóa lịch sử chat cho phiên {session_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa lịch sử: {str(e)}")

@app.delete("/api/settings/clear-all")
async def clear_all_data(session_id: str, data_type: str):
    """
    Clear specific type of data for user settings
    data_type: 'chat_history', 'ai_memory', 'knowledge_base', 'all'
    """
    try:
        result = {
            "success": True,
            "cleared": [],
            "message": ""
        }
        
        # 1. Xóa lịch sử chat (Chat History)
        if data_type in ['chat_history', 'all']:
            memory = await get_memory(session_id)
            
            if USE_DATABASE:
                with get_db_connection() as conn:
                    if conn:
                        cursor = conn.cursor()
                        cursor.execute('DELETE FROM conversation_messages WHERE session_id = %s', (session_id,))
                        cursor.execute('DELETE FROM conversation_sessions WHERE session_id = %s', (session_id,))
                        conn.commit()
            
            if hasattr(memory, 'memory_file') and memory.memory_file and memory.memory_file.exists():
                memory.memory_file.unlink()
            
            memory.conversations = []
            if session_id in conversation_memories:
                del conversation_memories[session_id]
            
            result["cleared"].append("chat_history")
        
        # 2. Xóa ký ức AI (AI Memory - user preferences, name, etc.)
        # This would be stored separately from chat history
        if data_type in ['ai_memory', 'all']:
            if USE_DATABASE:
                try:
                    with get_db_connection() as conn:
                        if conn:
                            cursor = conn.cursor()
                            # Delete from ai_memory table
                            cursor.execute('DELETE FROM ai_user_memory WHERE session_id = %s', (session_id,))
                            conn.commit()
                except Exception as e:
                    print(f"[WARNING] Could not delete AI memory from DB: {e}")
            
            # For now, AI memory is part of conversation context
            # In future: separate table for extracted facts (name, preferences, etc.)
            result["cleared"].append("ai_memory")
        
        # 3. Xóa kho dữ liệu (Knowledge Base)
        if data_type in ['knowledge_base', 'all']:
            # Get all knowledge bases for this session
            # Note: KB is currently global, but we can filter by session
            cleared_kbs = []
            for kb_name in list(kb_manager.knowledge_bases.keys()):
                try:
                    kb_manager.delete_kb(kb_name)
                    cleared_kbs.append(kb_name)
                except:
                    pass
            
            result["cleared"].append(f"knowledge_base ({len(cleared_kbs)} kho)")
        
        # Build message
        if data_type == 'all':
            result["message"] = "🗑️ Đã xóa TẤT CẢ dữ liệu: lịch sử chat, ký ức AI, và kho dữ liệu"
        elif data_type == 'chat_history':
            result["message"] = "🗑️ Đã xóa lịch sử chat"
        elif data_type == 'ai_memory':
            result["message"] = "🗑️ Đã xóa ký ức AI (tên, sở thích,...)"
        elif data_type == 'knowledge_base':
            result["message"] = "🗑️ Đã xóa tất cả kho dữ liệu"
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa dữ liệu: {str(e)}")

@app.get("/api/settings/data-stats/{session_id}")
async def get_data_stats(session_id: str):
    """Get data statistics for settings page"""
    try:
        stats = {
            "chat_history": {
                "message_count": 0,
                "size_bytes": 0,
                "last_updated": None
            },
            "ai_memory": {
                "memory_count": 0,
                "items": []
            },
            "knowledge_bases": {
                "kb_count": len(kb_manager.knowledge_bases),
                "total_documents": sum(len(kb.documents) for kb in kb_manager.knowledge_bases.values()),
                "kb_names": list(kb_manager.knowledge_bases.keys())
            }
        }
        
        # Get chat history stats
        memory = await get_memory(session_id)
        stats["chat_history"]["message_count"] = len(memory.conversations)
        
        if USE_DATABASE:
            with get_db_connection() as conn:
                if conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        SELECT updated_at FROM conversation_sessions 
                        WHERE session_id = %s
                    ''', (session_id,))
                    row = cursor.fetchone()
                    if row and row[0]:
                        stats["chat_history"]["last_updated"] = row[0].isoformat()
        
        # Get AI memory stats
        ai_memories = await get_ai_memory(session_id)
        stats["ai_memory"]["memory_count"] = len(ai_memories)
        stats["ai_memory"]["items"] = [{"key": k, "value": v} for k, v in ai_memories.items()]
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thống kê: {str(e)}")

@app.post("/api/memory/{session_id}/export")
async def export_memory_endpoint(session_id: str):
    """Export conversation memory as JSON"""
    try:
        memory = await get_memory(session_id)
        messages = memory.get_all_messages()
        
        export_data = {
            "session_id": session_id,
            "exported_at": datetime.now().isoformat(),
            "total_messages": len(messages),
            "conversations": messages
        }
        
        return {
            "success": True,
            "data": export_data,
            "filename": f"conversation_{session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất dữ liệu: {str(e)}")

@app.get("/api/memory")
async def list_all_memories():
    """List all available conversation sessions"""
    try:
        sessions = []
        if CONVERSATION_STORAGE_DIR.exists():
            for memory_file in CONVERSATION_STORAGE_DIR.glob("user_*.json"):
                try:
                    with open(memory_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        sessions.append({
                            "session_id": data.get("user_id"),
                            "message_count": len(data.get("conversations", [])),
                            "updated_at": data.get("updated_at"),
                            "file": str(memory_file)
                        })
                except:
                    pass
        
        return {
            "success": True,
            "total_sessions": len(sessions),
            "sessions": sessions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi liệt kê phiên: {str(e)}")

# Vercel serverless function handler
def handler(request):
    return app(request)

