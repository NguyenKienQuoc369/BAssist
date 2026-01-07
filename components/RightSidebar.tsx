"use client";

import { usePathname } from "next/navigation";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { useTheme } from "@/contexts/ThemeContext";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface RightSidebarProps {
  onLoadHistory?: (messages: any[]) => void;
}

export default function RightSidebar({ onLoadHistory }: RightSidebarProps) {
  const pathname = usePathname();
  const { histories, deleteHistory, clearHistory } = useChatHistory();
  const { isDark } = useTheme();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration before rendering
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return null;
  }

  // Map pathname to feature name
  const featureMap: Record<string, string> = {
    "/chat": "chat",
    "/study-buddy": "study-buddy",
    "/polisher": "polisher",
    "/personal-doctor": "personal-doctor",
    "/fact-check": "fact-check",
    "/knowledge-bases": "knowledge-bases",
  };

  const currentFeature = featureMap[pathname];
  const currentHistories = currentFeature ? histories[currentFeature] || [] : [];

  if (!currentFeature || currentFeature === "home" || pathname === "/") {
    return null;
  }

  const handleLoadHistory = (messages: any[]) => {
    if (onLoadHistory) {
      onLoadHistory(messages);
    }
  };

  return (
    <div className={`w-64 min-h-screen p-4 flex flex-col overflow-hidden sticky top-0 transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 border-l border-gray-800"
        : "bg-gradient-to-b from-white via-pink-50 to-white border-l border-pink-100"
    } shadow-lg`}>
      <div className="mb-4">
        <h3 className={`font-bold text-sm mb-3 flex items-center gap-2 transition-colors duration-300 ${
          isDark ? "text-white" : "text-gray-900"
        }`}>
          <span>📋 Lịch sử chat</span>
        </h3>
        {currentHistories.length > 0 && (
          <button
            onClick={() => clearHistory(currentFeature)}
            className={`w-full text-xs px-3 py-2 rounded-lg transition-all duration-300 font-medium ${
              isDark
                ? "text-red-300 border border-red-800 hover:border-red-700 hover:bg-red-900/20"
                : "text-red-600 border border-red-200 hover:text-red-700 hover:bg-red-50"
            }`}
          >
            🗑️ Xóa tất cả
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {currentHistories.length === 0 ? (
          <p className={`text-xs text-center py-8 transition-colors duration-300 ${
            isDark ? "text-gray-500" : "text-gray-500"
          }`}>
            <span className="block text-2xl mb-2">📭</span>
            Không có lịch sử
          </p>
        ) : (
          currentHistories.map((history) => (
            <div
              key={history.id}
              onClick={() => handleLoadHistory(history.messages)}
              className={`group rounded-xl p-3 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${
                isDark
                  ? "bg-gray-800 border border-gray-700 hover:border-pink-600 hover:bg-gradient-to-br hover:from-gray-800 hover:to-gray-900"
                  : "bg-white border border-pink-100 hover:border-pink-400 hover:shadow-lg hover:bg-gradient-to-br hover:from-pink-50 hover:to-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate transition-colors duration-300 ${
                    isDark
                      ? "text-gray-300 group-hover:text-pink-400"
                      : "text-gray-900 group-hover:text-pink-600"
                  }`}>
                    {history.title}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistory(currentFeature, history.id);
                  }}
                  className={`opacity-0 group-hover:opacity-100 transition-all duration-300 p-0.5 hover:scale-110 ${
                    isDark
                      ? "text-gray-500 hover:text-red-500"
                      : "text-gray-400 hover:text-red-600"
                  }`}
                  title="Xóa"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-xs line-clamp-2 transition-colors duration-300 ${
                isDark
                  ? "text-gray-400 group-hover:text-gray-400"
                  : "text-gray-600 group-hover:text-gray-700"
              }`}>
                {history.preview}
              </p>
              <span className={`text-xs mt-2 block transition-colors duration-300 ${
                isDark
                  ? "text-gray-600 group-hover:text-gray-500"
                  : "text-gray-400 group-hover:text-gray-500"
              }`}>
                {new Date(history.timestamp).toLocaleDateString("vi-VN")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
