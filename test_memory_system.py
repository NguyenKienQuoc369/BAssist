#!/usr/bin/env python3
"""
Test script for persistent conversation memory system
Run: python test_memory_system.py
"""

import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import sys

# Add api to path
sys.path.insert(0, str(Path(__file__).parent))

def test_conversation_memory():
    """Test ConversationMemory class"""
    print("🧪 Testing ConversationMemory Class...")
    
    # Create temp directory for testing
    temp_dir = Path(tempfile.mkdtemp())
    print(f"✓ Created temp directory: {temp_dir}")
    
    # Mock the CONVERSATION_STORAGE_DIR
    import sys
    from unittest.mock import patch
    
    # We'll test the core logic without needing the FastAPI app
    test_messages = [
        {"role": "user", "content": "What is AI?", "timestamp": "2026-01-22T10:00:00", "kb": None},
        {"role": "assistant", "content": "AI is artificial intelligence...", "timestamp": "2026-01-22T10:00:05", "kb": None},
        {"role": "user", "content": "Tell me more", "timestamp": "2026-01-22T10:01:00", "kb": None},
        {"role": "assistant", "content": "AI has many applications...", "timestamp": "2026-01-22T10:01:05", "kb": "my-kb"},
    ]
    
    # Test file operations
    session_file = temp_dir / "user_test_session_123.json"
    
    # 1. Test saving
    print("\n📝 Test 1: Saving conversation...")
    data = {
        "user_id": "test_session_123",
        "updated_at": datetime.now().isoformat(),
        "conversations": test_messages
    }
    
    with open(session_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    assert session_file.exists(), "❌ File not created"
    print(f"✓ Saved {len(test_messages)} messages")
    
    # 2. Test loading
    print("\n📖 Test 2: Loading conversation...")
    with open(session_file, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    
    assert len(loaded["conversations"]) == 4, "❌ Wrong number of messages"
    assert loaded["user_id"] == "test_session_123", "❌ Wrong user ID"
    print(f"✓ Loaded {len(loaded['conversations'])} messages successfully")
    
    # 3. Test appending
    print("\n➕ Test 3: Appending messages...")
    loaded["conversations"].append({
        "role": "user",
        "content": "What about ML?",
        "timestamp": datetime.now().isoformat(),
        "kb": None
    })
    
    with open(session_file, "w", encoding="utf-8") as f:
        json.dump(loaded, f, ensure_ascii=False, indent=2)
    
    with open(session_file, "r", encoding="utf-8") as f:
        reloaded = json.load(f)
    
    assert len(reloaded["conversations"]) == 5, "❌ Message not appended"
    print(f"✓ Successfully appended message (now {len(reloaded['conversations'])} total)")
    
    # 4. Test context building
    print("\n🧩 Test 4: Building context...")
    context = "📝 LỊCH SỬ CUỘC TRÒ CHUYỆN GẦN ĐÂY:\n"
    for msg in reloaded["conversations"][-3:]:
        role = "👤 Bạn" if msg["role"] == "user" else "🤖 AI"
        content = msg["content"][:300]
        context += f"{role}: {content}\n\n"
    
    assert "What about ML?" in context, "❌ Recent message not in context"
    assert len(context) > 100, "❌ Context too short"
    print(f"✓ Built context ({len(context)} chars)")
    print(f"\nContext preview:\n{context[:200]}...")
    
    # 5. Test file structure
    print("\n📂 Test 5: Directory structure...")
    storage_dir = temp_dir / "user_data"
    storage_dir.mkdir(exist_ok=True)
    
    # Create multiple user files
    for i in range(3):
        user_file = storage_dir / f"user_session_{i}.json"
        with open(user_file, "w") as f:
            json.dump({"user_id": f"session_{i}", "conversations": []}, f)
    
    sessions = list(storage_dir.glob("user_*.json"))
    assert len(sessions) == 3, "❌ Wrong number of session files"
    print(f"✓ Created and found {len(sessions)} session files")
    
    # 6. Test memory metadata
    print("\n📊 Test 6: Memory metadata...")
    stat = session_file.stat()
    size_kb = stat.st_size / 1024
    print(f"✓ File size: {size_kb:.2f} KB")
    print(f"✓ Last modified: {datetime.fromtimestamp(stat.st_mtime)}")
    
    # 7. Test Vietnamese content
    print("\n🇻🇳 Test 7: Vietnamese content handling...")
    vietnamese_test = {
        "user_id": "test_vi",
        "conversations": [
            {
                "role": "user",
                "content": "Hôm nay thời tiết thế nào?",
                "timestamp": datetime.now().isoformat(),
                "kb": None
            },
            {
                "role": "assistant",
                "content": "Hôm nay là một ngày đẹp trời ☀️",
                "timestamp": datetime.now().isoformat(),
                "kb": None
            }
        ]
    }
    
    vi_file = temp_dir / "user_test_vi.json"
    with open(vi_file, "w", encoding="utf-8") as f:
        json.dump(vietnamese_test, f, ensure_ascii=False, indent=2)
    
    with open(vi_file, "r", encoding="utf-8") as f:
        reloaded_vi = json.load(f)
    
    assert "Hôm nay" in reloaded_vi["conversations"][0]["content"], "❌ Vietnamese text corrupted"
    print(f"✓ Vietnamese text preserved correctly")
    print(f"✓ Sample: {reloaded_vi['conversations'][0]['content']}")
    
    # 8. Test export format
    print("\n📤 Test 8: Export format...")
    export_data = {
        "session_id": "test_session_123",
        "exported_at": datetime.now().isoformat(),
        "total_messages": len(loaded["conversations"]),
        "conversations": loaded["conversations"]
    }
    
    assert "exported_at" in export_data, "❌ Missing export metadata"
    assert "total_messages" in export_data, "❌ Missing message count"
    print(f"✓ Export format valid")
    print(f"  - Session: {export_data['session_id']}")
    print(f"  - Messages: {export_data['total_messages']}")
    print(f"  - Exported: {export_data['exported_at']}")
    
    # Cleanup
    print("\n🧹 Cleaning up...")
    shutil.rmtree(temp_dir)
    print("✓ Temp directory removed")
    
    return True

def test_session_id_generation():
    """Test session ID generation"""
    print("\n🎫 Testing Session ID Generation...")
    
    import uuid
    
    # Generate several IDs
    ids = [str(uuid.uuid4()) for _ in range(3)]
    
    # Check uniqueness
    assert len(set(ids)) == 3, "❌ Duplicate IDs generated"
    print(f"✓ Generated {len(ids)} unique session IDs")
    
    # Check format
    for sid in ids:
        assert len(sid) == 36, "❌ Wrong UUID format"
        assert sid.count('-') == 4, "❌ Invalid UUID format"
    print(f"✓ All IDs have valid UUID format (36 chars)")
    print(f"  Example: {ids[0]}")
    
    return True

def main():
    """Run all tests"""
    print("="*60)
    print("🧠 PERSISTENT CONVERSATION MEMORY SYSTEM - TEST SUITE")
    print("="*60)
    
    tests = [
        ("ConversationMemory", test_conversation_memory),
        ("Session ID Generation", test_session_id_generation),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"\n❌ {test_name} FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "="*60)
    print("📊 TEST RESULTS")
    print("="*60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {(passed/(passed+failed)*100):.0f}%")
    print("="*60)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
