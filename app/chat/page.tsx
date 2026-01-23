"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { MessageCircle, Send, Paperclip, X, Zap, Database } from "lucide-react";
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

export default function Chat() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Chào bạn! 👋 Mình là BAssist, trợ lý AI của bạn. Mình ở đây để giúp bạn với bất kì điều gì bạn cần - từ trả lời câu hỏi, giải thích những thứ phức tạp, cho ý tưởng hay, viết và chỉnh sửa bài viết, cho đến lập kế hoạch công việc. Cứ thoải mái hỏi mình bất cứ điều gì nhé! 😊"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showLongLoadingWarning, setShowLongLoadingWarning] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addHistory } = useChatHistory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load knowledge bases
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

  useEffect(() => {
    if (loading) {
      setShowLongLoadingWarning(false);
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLongLoadingWarning(true);
      }, 15000); // 15 seconds
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setShowLongLoadingWarning(false);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  const handleSend = async () => {
    if (!input.trim() && files.length === 0) {
      setError("Vui lòng nhập tin nhắn hoặc tải lên tệp");
      return;
    }

    const userMessage: Message = { 
      role: "user", 
      content: files.length > 0 ? `[${files.length} tệp đính kèm] ${input}` : input 
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    const currentFiles = [...files];
    setFiles([]);
    setLoading(true);
    setError("");

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      
      // Add files if in advanced mode
      if (advancedMode && currentFiles.length > 0) {
        currentFiles.forEach((file) => {
          formData.append("files", file);
        });
      }
      
      formData.append("request", JSON.stringify({ 
        text: input,
        history: messages,
        knowledge_base: selectedKb || undefined
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const detail = (data && (data.detail || data.error)) || "Không thể gửi tin nhắn";
        throw new Error(detail);
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);
      
      // Save to history
      addHistory("chat", newMessages);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Rollback: remove user message
        setMessages(messages);
        setError("Đã hủy yêu cầu");
      } else {
        const detail = err?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
        setError(detail);
        console.error("Chat error:", err);
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

  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      setError("Tối đa 10 tệp");
      return;
    }
    setFiles([...files, ...selectedFiles]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleLoadHistory = (messages: Message[]) => {
    setMessages(messages);
    scrollToBottom();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className={`flex-1 flex flex-col transition-colors duration-300 ${
        isDark
          ? "bg-gray-950"
          : "bg-gradient-to-br from-pink-50 via-white to-pink-50"
      }`}>
        <div className={`p-6 shadow-sm transition-colors duration-300 ${
          isDark
            ? "border-b border-gray-800 bg-gray-900/50"
            : "border-b border-pink-100 bg-white/80"
        } backdrop-blur`}>
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors duration-300 ${
                isDark
                  ? "bg-pink-900/30"
                  : "bg-gradient-to-br from-pink-100 to-pink-50"
              }`}>
                <MessageCircle className={`w-6 h-6 transition-colors duration-300 ${
                  isDark ? "text-pink-400" : "text-pink-600"
                }`} />
              </div>
              <h1 className={`text-2xl font-bold bg-clip-text text-transparent transition-colors duration-300 ${
                isDark
                  ? "bg-gradient-to-r from-pink-300 to-pink-400"
                  : "bg-gradient-to-r from-gray-900 to-pink-600"
              }`}>Chat AI</h1>
            </div>
            <div className="flex items-center gap-2">
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
              
              <button
                onClick={() => setAdvancedMode(!advancedMode)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
                  advancedMode
                    ? "bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-lg shadow-pink-300/30"
                    : isDark
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                }`}
                title="Bật/tắt chế độ nâng cao (upload file)"
              >
                <Zap className="w-4 h-4" />
                {advancedMode ? "Nâng Cao" : "Cơ Bản"}
              </button>
            </div>
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
            {/* KB Active Indicator */}
            {selectedKb && (
              <div className={`p-3 rounded-lg border transition-all duration-300 ${
                isDark 
                  ? "bg-green-900/20 border-green-700/50 text-green-300" 
                  : "bg-green-50 border-green-200 text-green-700"
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4" />
                  <span className="font-medium">
                    🔗 Đang sử dụng Knowledge Base: <strong>{selectedKb}</strong>
                  </span>
                  <span className="text-xs opacity-75">
                    (AI có thể đọc nội dung từ các file đã upload)
                  </span>
                </div>
              </div>
            )}
            
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-20 animate-fade-up">
                <div className={`inline-block p-4 rounded-full mb-4 transition-all duration-300 ${
                  isDark ? "bg-gray-800/50" : "bg-pink-100/50"
                }`}>
                  <MessageCircle className={`w-12 h-12 animate-pulse ${
                    isDark ? "text-pink-400" : "text-pink-500"
                  }`} />
                </div>
                <p className="text-sm font-medium">Bắt đầu trò chuyện của bạn...</p>
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
                {showLongLoadingWarning && (
                  <div className={`border rounded-2xl p-4 animate-pulse transition-all duration-300 backdrop-blur-md ${
                    isDark
                      ? "bg-yellow-900/20 border-yellow-700/50 text-yellow-200"
                      : "bg-yellow-50/80 border-yellow-300/50 text-yellow-700"
                  }`}>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <span className="animate-bounce">⏳</span>
                      <span>AI đang xử lý... Nếu quá lâu, bạn có thể hủy và thử lại</span>
                    </p>
                  </div>
                )}
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
              <div className={`px-4 py-2 rounded-lg text-sm mb-3 border flex items-start gap-2 transition-colors duration-300 ${
                isDark
                  ? "bg-red-900/20 border-red-800 text-red-200"
                  : "bg-red-50/80 border-red-200 text-red-700"
              }`}>
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* File Display */}
            {advancedMode && files.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg px-3 py-2 text-sm flex items-center gap-2 max-w-xs shadow-sm hover:shadow-md transition-shadow duration-300 ${
                      isDark
                        ? "bg-gray-800 border-gray-700"
                        : "bg-gradient-to-r from-pink-50 to-pink-100 border-pink-300"
                    }`}
                  >
                    <span className={`font-medium transition-colors duration-300 ${
                      isDark ? "text-pink-400" : "text-pink-600"
                    }`}>📎</span>
                    <span className={`truncate transition-colors duration-300 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}>{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className={`ml-auto transition-colors duration-300 ${
                        isDark
                          ? "text-gray-400 hover:text-red-500"
                          : "text-gray-400 hover:text-red-600"
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {advancedMode && (
                <label className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md flex items-center gap-2 ${
                  isDark
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-pink-100 hover:bg-pink-200 text-pink-700"
                }`}>
                  <Paperclip className="w-4 h-4" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={loading || files.length >= 10}
                  />
                </label>
              )}
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={advancedMode ? "Nhập tin nhắn + tệp... (Enter gửi)" : "Nhập tin nhắn... (Enter gửi)"}
                className="dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-pink-600 dark:focus:ring-pink-900/30 flex-1 p-3 text-sm border border-pink-200 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none resize-none transition-all duration-300"
                rows={1}
                disabled={loading}
              />
              {!loading ? (
                <button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && files.length === 0)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-lg hover:shadow-lg hover:shadow-pink-300/30 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all duration-300 hover:scale-105"
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
