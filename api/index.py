from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from typing import Optional, List, Dict
import PyPDF2
import io
import json
import mimetypes

# Initialize FastAPI app
app = FastAPI(title="BAssist AI API")

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
    """Extract text content from uploaded files"""
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        # PDF files
        if filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        
        # Text files
        elif filename.endswith(('.txt', '.md', '.docx')):
            return content.decode('utf-8', errors='ignore')
        
        # Image files - for now just return filename info
        elif filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp')):
            return f"[Image file: {filename}]"
        
        # Default: try to decode as text
        else:
            return content.decode('utf-8', errors='ignore')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

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
    def __init__(self):
        self.knowledge_bases: Dict[str, KnowledgeBase] = {}
    
    def create_kb(self, name: str) -> KnowledgeBase:
        """Create new knowledge base"""
        if name in self.knowledge_bases:
            return self.knowledge_bases[name]
        kb = KnowledgeBase(name)
        self.knowledge_bases[name] = kb
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
    Summarize text or PDF content
    """
    try:
        # Get text from either request body or uploaded files
        text = ""
        kb_name = None
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
                kb_name = request_data.get("knowledge_base")
            except:
                text = request
        else:
            raise HTTPException(status_code=400, detail="Please provide text or upload files")
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Get knowledge base context if specified
        kb_context = ""
        if kb_name:
            kb = kb_manager.get_kb(kb_name)
            if kb and kb.documents:
                relevant_docs = kb.query(text, top_k=3)
                if relevant_docs:
                    kb_context = "\n\n=== ADDITIONAL REFERENCE MATERIALS FROM KNOWLEDGE BASE ===\n"
                    for i, doc in enumerate(relevant_docs, 1):
                        kb_context += f"--- Reference Document {i} ---\n{doc}\n\n"
                    kb_context += "=== END OF REFERENCE MATERIALS ===\n\n"
        
        prompt = f"""You are a helpful study assistant. Please provide a clear, 
        concise summary of the following content. Break it down into key points 
        and main ideas.{kb_context}

        {text}

        Summary:"""
        
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "summary": response.text,
            "original_length": len(text),
            "summary_length": len(response.text)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.post("/api/polisher")
async def polisher(files: List[UploadFile] = File(None), request: str = Form(None)):
    """
    Rewrite text for Business English
    """
    try:
        import traceback
        # Get text from either request body or uploaded files
        text = ""
        kb_name = None
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
                kb_name = request_data.get("knowledge_base")
            except Exception as parse_err:
                print(f"JSON parse error: {parse_err}, using raw request")
                text = request
        else:
            raise HTTPException(status_code=400, detail="Please provide text or upload files")
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Get knowledge base context if specified
        kb_context = ""
        if kb_name:
            kb = kb_manager.get_kb(kb_name)
            if kb and kb.documents:
                relevant_docs = kb.query(text, top_k=3)
                if relevant_docs:
                    kb_context = "\n\n=== STYLE REFERENCE FROM KNOWLEDGE BASE ===\n"
                    kb_context += "Use these documents as style and tone references:\n\n"
                    for i, doc in enumerate(relevant_docs, 1):
                        kb_context += f"--- Style Reference {i} ---\n{doc}\n\n"
                    kb_context += "=== END OF STYLE REFERENCES ===\n\n"
        
        prompt = f"""You are a professional business writing expert. Please rewrite 
        the following text to make it more professional, clear, and suitable for 
        business communication. Maintain the original meaning but enhance clarity, 
        tone, and professionalism.{kb_context}

        Original text:
        {text}

        Professional version:"""
        
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "original": text,
            "polished": response.text
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in polisher endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error polishing text: {str(e)}")

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
        
        prompt = f"""Please fact-check the following statement or claim. 
        Use current, reliable sources to verify the accuracy of the information.
        Provide:
        1. Whether the claim is TRUE, FALSE, PARTIALLY TRUE, or UNVERIFIABLE
        2. Supporting evidence or sources
        3. Any important context or nuances

        Claim to fact-check:
        {text}

        Fact-check analysis:"""
        
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
            
            prompt = f"""Please analyze the following statement for factual accuracy 
            based on your knowledge. Note: This is based on training data, not real-time 
            search results.

            Statement:
            {text}

            Analysis:"""
            
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
    General chat conversation with AI
    """
    try:
        # Parse request data
        text = ""
        history = []
        kb_name = None
        if request:
            try:
                import json
                request_data = json.loads(request)
                text = request_data.get("text", "")
                history = request_data.get("history", [])
                kb_name = request_data.get("knowledge_base")
            except:
                text = request
        
        # Process uploaded files
        if files and len(files) > 0 and files[0] and files[0].filename:
            file_texts = []
            for file in files:
                if file and file.filename:
                    file_text = await extract_text_from_file(file)
                    file_texts.append(f"--- {file.filename} ---\n{file_text}")
            file_content = "\n\n".join(file_texts)
        else:
            file_content = ""
        
        if not text and not file_content:
            raise HTTPException(status_code=400, detail="Please provide a message or upload files")
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build conversation history for context
        conversation_context = ""
        if history:
            for msg in history[-10:]:  # Last 10 messages for context
                role = "User" if msg.get("role") == "user" else "Assistant"
                conversation_context += f"{role}: {msg.get('content', '')}\n\n"
        
        # Get knowledge base context if specified
        kb_context = ""
        if kb_name:
            kb = kb_manager.get_kb(kb_name)
            if kb and kb.documents:
                relevant_docs = kb.query(text, top_k=3)
                if relevant_docs:
                    kb_context = "\n\n" + "="*80 + "\n"
                    kb_context += "📚 DOCUMENTS FROM YOUR KNOWLEDGE BASE\n"
                    kb_context += "="*80 + "\n"
                    kb_context += "The user has previously uploaded documents to their knowledge base.\n"
                    kb_context += "The TEXT CONTENT from these uploaded files is provided below.\n"
                    kb_context += "You HAVE ACCESS to this content and MUST use it to answer questions.\n"
                    kb_context += "DO NOT say you cannot access files - you CAN read the content below!\n\n"
                    
                    for i, doc in enumerate(relevant_docs, 1):
                        kb_context += f"--- DOCUMENT {i} CONTENT START ---\n"
                        kb_context += doc + "\n"
                        kb_context += f"--- DOCUMENT {i} CONTENT END ---\n\n"
                    
                    kb_context += "="*80 + "\n"
                    kb_context += "REMEMBER: The content above IS AVAILABLE to you. Use it to answer!\n"
                    kb_context += "="*80 + "\n\n"
        
        # Build prompt with file content if available
        file_context = f"\nFile Content:\n{file_content}\n" if file_content else ""
        
        if kb_context:
            prompt = f"""You are a helpful AI assistant. The user has uploaded documents to their knowledge base.

{kb_context}

CRITICAL INSTRUCTION: 
- You HAVE the document content above - it was extracted from the user's uploaded files
- You CAN and MUST use this information to answer the user's questions
- DO NOT say "I cannot access files" - you already have the file content above!
- Read the document content carefully and answer based on what you see there

Previous conversation:
{conversation_context}

User's question: {text}

Your answer (based on the documents above):"""
        else:
            prompt = f"""You are a helpful, friendly AI assistant. Respond naturally and helpfully to the user's message.{file_context}
{conversation_context}User: {text}

A: """
        
        
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "response": response.text
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR in chat endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")

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
        prompt = f"""You are a knowledgeable personal health advisor and wellness coach. 
Based on the following health information or question from the user, provide personalized, evidence-based health advice and recommendations.

Important guidelines:
- Always emphasize that serious medical issues require professional medical consultation
- Provide general wellness and preventive health tips
- Consider lifestyle, diet, exercise, and mental health factors
- Be empathetic and supportive
- Suggest when professional medical help is needed
- Provide practical, actionable advice{kb_context}

User's health information or question:
{text_content}

Please provide comprehensive health advice and personalized recommendations."""

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

@app.post("/api/knowledge-bases/create")
async def create_knowledge_base(request: str = Form(None)):
    """Create a new knowledge base"""
    try:
        if not request:
            raise HTTPException(status_code=400, detail="Please provide knowledge base name")
        
        request_data = json.loads(request)
        kb_name = request_data.get("name", "").strip()
        
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

# Vercel serverless function handler
def handler(request):
    return app(request)

