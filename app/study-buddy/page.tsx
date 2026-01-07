"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { BookOpen, Send, Paperclip, X, Database } from "lucide-react";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { useTheme } from "@/contexts/ThemeContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface KnowledgeBase {
  name: string;
  document_count: number;
}

export default function StudyBuddy() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! 📚 Mình là Study Buddy, người bạn học tập của bạn. Mình chuyên tóm tắt tài liệu, giải thích những khái niệm khó, và giúp bạn học hiệu quả hơn. Bạn có thể paste text hoặc upload file (PDF, Word, hình ảnh, v.v. - tối đa 10 file), và mình sẽ giúp bạn nắm bắt nội dung một cách nhanh chóng. Có gì cần tóm tắt không? 😊"
    }
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addHistory } = useChatHistory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadKbs = async () => {
      try {
        const response = await fetch("/api/knowledge-bases");
        const data = await response.json();
        if (data.success) {
          setKnowledgeBases(data.knowledge_bases || []);
        }
      } catch (err) {
        console.error("Error loading knowledge bases:", err);
      }
    };
    loadKbs();
  }, []);

  const handleSend = async () => {
    if (!input.trim() && files.length === 0) {
      setError("Vui lòng nhập văn bản hoặc tải lên tệp");
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: files.length > 0 ? `[${files.length} tệp đính kèm]` : input 
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    const currentInput = input;
    const currentFiles = [...files];
    
    setInput("");
    setFiles([]);
    setLoading(true);
    setError("");

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      if (currentFiles.length > 0) {
        currentFiles.forEach((file) => {
          formData.append("files", file);
        });
      } else if (currentInput.trim()) {
        formData.append("request", JSON.stringify({ 
          text: currentInput,
          knowledge_base: selectedKb || undefined
        }));
      }

      const response = await fetch("/api/study-buddy", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Không thể tạo tóm tắt");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.summary,
      };
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);
      
      // Save to history
      addHistory("study-buddy", newMessages);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Rollback: remove user message
        setMessages(messages);
        setError("Đã hủy yêu cầu");
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLoadHistory = (messages: Message[]) => {
    setMessages(messages);
    scrollToBottom();
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className={`flex-1 flex flex-col transition-colors duration-300 ${
        isDark
          ? "bg-gray-950"
          : "bg-gradient-to-br from-pink-50 via-white to-pink-50"
      }`}>
        <div className={`p-4 backdrop-blur transition-colors duration-300 ${
          isDark
            ? "border-b border-gray-800 bg-gray-900/50"
            : "border-b border-pink-100 bg-white/80"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className={`w-6 h-6 transition-colors duration-300 ${
                  isDark ? "text-pink-400" : "text-pink-600"
                }`} />
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}>Bạn Học Tập</h1>
              </div>
              <p className={`text-xs mt-0.5 transition-colors duration-300 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}>Tóm tắt văn bản, PDF, Word, ảnh</p>
            </div>
            
            {/* Knowledge Base Selector */}
            <select
              value={selectedKb}
              onChange={(e) => setSelectedKb(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedKb
                  ? "bg-gradient-to-r from-green-500 to-green-400 text-white shadow-lg shadow-green-300/30"
                  : isDark
                  ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              <option value="">🗂️ Không dùng KB</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.name} value={kb.name}>
                  📚 {kb.name} ({kb.document_count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 transition-all duration-500 relative ${
          isDark
            ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
            : "bg-gradient-to-br from-pink-50/80 via-white to-pink-50/80 backdrop-blur-sm"
        }`}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-0 left-1/4 w-72 h-72 md:w-80 md:h-80 rounded-full blur-2xl opacity-15 motion-safe:animate-blob motion-reduce:hidden ${
              isDark ? "bg-pink-600" : "bg-pink-300"
            }`}></div>
            <div className={`absolute bottom-0 right-1/4 w-72 h-72 md:w-80 md:h-80 rounded-full blur-2xl opacity-15 motion-safe:animate-blob motion-reduce:hidden animation-delay-2000 ${
              isDark ? "bg-purple-600" : "bg-blue-200"
            }`}></div>
          </div>
          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-20 animate-fade-up">
                <div className={`inline-block p-4 rounded-full mb-4 transition-all duration-300 ${
                  isDark ? "bg-gray-800/50" : "bg-pink-100/50"
                }`}>
                  <BookOpen className={`w-12 h-12 animate-pulse ${
                    isDark ? "text-pink-400" : "text-pink-500"
                  }`} />
                </div>
                <p className="text-sm font-medium">Gửi văn bản hoặc tệp để tóm tắt</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-up transition-all duration-500`}
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s forwards`,
                  opacity: 0
                }}
              >
                <div
                  className={`max-w-[75%] rounded-3xl p-5 text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-xl shadow-pink-300/40 rounded-br-none backdrop-blur-sm"
                      : isDark
                      ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-gray-100 shadow-2xl shadow-gray-900/50 rounded-bl-none backdrop-blur-sm"
                      : "bg-white/80 text-gray-900 shadow-xl shadow-pink-200/30 rounded-bl-none backdrop-blur-sm"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col justify-start gap-2 animate-fade-up">
                <div className={`rounded-3xl p-4 shadow-lg transition-all duration-300 backdrop-blur-md ${
                  isDark
                    ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 shadow-gray-900/50"
                    : "bg-gradient-to-r from-pink-50/80 to-white/80 shadow-pink-200/30"
                }`}>
                  <LoadingSpinner />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className={`border-t p-4 transition-colors duration-300 ${
          isDark
            ? "border-gray-800 bg-gray-950"
            : "border-pink-100 bg-white"
        }`}>
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className={`px-3 py-1.5 rounded text-sm mb-2 border transition-colors duration-300 ${
                isDark
                  ? "bg-red-900/20 border-red-700 text-red-200"
                  : "bg-red-50 border-red-300 text-red-600"
              }`}>
                {error}
              </div>
            )}

            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <div key={idx} className={`flex items-center gap-1 rounded px-2 py-1 text-xs border transition-colors duration-300 ${
                    isDark
                      ? "bg-pink-900/30 border-pink-700"
                      : "bg-pink-50 border-pink-200"
                  }`}>
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button onClick={() => removeFile(idx)} className={`transition-colors duration-300 ${
                      isDark
                        ? "text-red-400 hover:text-red-300"
                        : "text-red-500 hover:text-red-700"
                    }`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <label className={`flex items-center justify-center px-3 rounded-lg cursor-pointer transition-colors duration-300 ${
                isDark
                  ? "border-gray-700 hover:bg-gray-800 text-gray-400 border"
                  : "border-pink-100 hover:bg-pink-50 border"
              }`}>
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  onChange={(e) => {
                    const newFile = e.target.files?.[0];
                    if (newFile && files.length < 10) {
                      setFiles([...files, newFile]);
                    }
                    e.target.value = "";
                  }}
                  accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={loading || files.length >= 10}
                />
              </label>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập văn bản cần tóm tắt... (Enter gửi)"
                className={`flex-1 p-3 text-sm rounded-lg outline-none resize-none border transition-colors duration-300 ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-pink-500"
                    : "border-pink-100 focus:border-pink-500"
                }`}
                rows={1}
                disabled={loading}
              />
              {!loading ? (
                <button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && files.length === 0)}
                  className={`px-4 text-white rounded-lg transition-colors duration-300 disabled:cursor-not-allowed ${
                    isDark
                      ? "bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 disabled:bg-gray-700"
                      : "bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 disabled:bg-gray-300"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="px-4 dark:hover:bg-red-700 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Hủy yêu cầu"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <RightSidebar onLoadHistory={handleLoadHistory} />
    </div>
  );
}
