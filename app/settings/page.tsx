"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Settings as SettingsIcon, Trash2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface DataStats {
  chat_history?: {
    message_count: number;
    last_updated?: string;
  };
  ai_memory?: {
    memory_count: number;
    items?: Array<{ key: string; value: string }>;
  };
  knowledge_bases?: {
    kb_count: number;
    total_documents: number;
    kb_names?: string[];
  };
}

export default function Settings() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState<DataStats>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Get session_id from localStorage
  const getSessionId = () => {
    if (typeof window !== "undefined") {
      let sessionId = localStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("session_id", sessionId);
      }
      return sessionId;
    }
    return "";
  };

  // Load statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const response = await fetch(`/api/settings/data-stats/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Delete data
  const handleDelete = async (dataType: string) => {
    setDeleting(dataType);
    setShowConfirm(null);
    
    try {
      const sessionId = getSessionId();
      const response = await fetch(`/api/settings/clear-all?session_id=${sessionId}&data_type=${dataType}`, {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: "success", text: `Đã xóa ${getDataTypeName(dataType)} thành công!` });
        await loadStats(); // Reload stats
      } else {
        setMessage({ type: "error", text: data.error || "Có lỗi xảy ra" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Không thể kết nối đến server" });
    } finally {
      setDeleting(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const getDataTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      chat_history: "Lịch sử chat",
      ai_memory: "Ký ức AI",
      knowledge_base: "Kho dữ liệu",
      all: "Tất cả dữ liệu"
    };
    return names[type] || type;
  };

  const ConfirmDialog = ({ dataType, onConfirm, onCancel }: { dataType: string; onConfirm: () => void; onCancel: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl p-6 max-w-md w-full shadow-2xl ${
        isDark ? "bg-gray-800 border border-gray-700" : "bg-white"
      }`}>
        <div className="flex items-start gap-4 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Xác nhận xóa {getDataTypeName(dataType)}
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDark 
                ? "bg-gray-700 hover:bg-gray-600 text-white" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );

  const DataSection = ({ 
    title, 
    description, 
    count, 
    details, 
    dataType, 
    icon: Icon,
    color 
  }: { 
    title: string; 
    description: string; 
    count: number; 
    details?: string; 
    dataType: string;
    icon: any;
    color: string;
  }) => (
    <div className={`rounded-xl p-6 transition-all duration-300 ${
      isDark 
        ? "bg-gray-800/50 border border-gray-700 hover:bg-gray-800" 
        : "bg-white border border-gray-200 hover:shadow-lg"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              {title}
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {description}
            </p>
          </div>
        </div>
      </div>
      
      <div className={`mb-4 p-4 rounded-lg ${
        isDark ? "bg-gray-900/50" : "bg-gray-50"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-500" />
          <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {count} {title.toLowerCase()}
          </span>
        </div>
        {details && (
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {details}
          </p>
        )}
      </div>

      <button
        onClick={() => setShowConfirm(dataType)}
        disabled={deleting !== null || count === 0}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
          count === 0
            ? isDark
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            : deleting === dataType
            ? "bg-red-400 text-white cursor-wait"
            : "bg-red-600 hover:bg-red-700 text-white hover:scale-105"
        }`}
      >
        <Trash2 className="w-4 h-4" />
        {deleting === dataType ? "Đang xóa..." : count === 0 ? "Không có dữ liệu" : `Xóa ${title}`}
      </button>
    </div>
  );

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      isDark ? "bg-gray-950" : "bg-gradient-to-br from-pink-50 via-white to-purple-50"
    }`}>
      <Sidebar />
      
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className={`w-8 h-8 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
              <h1 className={`text-3xl font-bold ${
                isDark 
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
              }`}>
                Cài Đặt
              </h1>
            </div>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Quản lý dữ liệu của bạn
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === "success"
                ? isDark 
                  ? "bg-green-900/30 border border-green-700 text-green-400"
                  : "bg-green-50 border border-green-200 text-green-700"
                : isDark
                  ? "bg-red-900/30 border border-red-700 text-red-400"
                  : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            </div>
          ) : (
            <>
              {/* Data Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <DataSection
                  title="Lịch sử chat"
                  description="Tất cả tin nhắn trong các cuộc trò chuyện"
                  count={stats.chat_history?.message_count || 0}
                  details={stats.chat_history?.last_updated ? `Cập nhật lần cuối: ${new Date(stats.chat_history.last_updated).toLocaleString('vi-VN')}` : undefined}
                  dataType="chat_history"
                  icon={SettingsIcon}
                  color="bg-blue-600"
                />

                <DataSection
                  title="Ký ức AI"
                  description="Thông tin AI đã ghi nhớ về bạn"
                  count={stats.ai_memory?.memory_count || 0}
                  details={stats.ai_memory?.items?.map(item => `${item.key}: ${item.value}`).join(", ")}
                  dataType="ai_memory"
                  icon={SettingsIcon}
                  color="bg-purple-600"
                />

                <DataSection
                  title="Kho dữ liệu"
                  description="Các knowledge bases đã tạo"
                  count={stats.knowledge_bases?.kb_count || 0}
                  details={stats.knowledge_bases?.kb_names?.join(", ") || `${stats.knowledge_bases?.total_documents || 0} tài liệu`}
                  dataType="knowledge_base"
                  icon={SettingsIcon}
                  color="bg-green-600"
                />
              </div>

              {/* Delete All Section */}
              <div className={`rounded-xl p-6 border-2 transition-all duration-300 ${
                isDark 
                  ? "bg-red-900/10 border-red-700 hover:bg-red-900/20" 
                  : "bg-red-50 border-red-200 hover:shadow-lg"
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-red-600">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Xóa tất cả dữ liệu
                      </h3>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Xóa toàn bộ lịch sử chat, ký ức AI và kho dữ liệu
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfirm("all")}
                  disabled={deleting !== null}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    deleting === "all"
                      ? "bg-red-400 text-white cursor-wait"
                      : "bg-red-600 hover:bg-red-700 text-white hover:scale-105"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting === "all" ? "Đang xóa tất cả..." : "Xóa tất cả dữ liệu"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <ConfirmDialog
          dataType={showConfirm}
          onConfirm={() => handleDelete(showConfirm)}
          onCancel={() => setShowConfirm(null)}
        />
      )}
    </div>
  );
}
