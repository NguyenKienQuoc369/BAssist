"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useTheme } from "@/contexts/ThemeContext";
import { CheckCircle, Send, Upload } from "lucide-react";

export default function FactCheck() {
  const { isDark } = useTheme();
  const [claim, setClaim] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFactCheck = async () => {
    if (!claim.trim() && files.length === 0) {
      setError("Vui lòng nhập tuyên bố hoặc tải lên tệp");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      if (files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      } else if (claim.trim()) {
        formData.append("request", JSON.stringify({ text: claim }));
      }

      const response = await fetch("/api/fact-check", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to fact-check");
      }

      const data = await response.json();
      setResult(data.fact_check_result);
    } catch (err) {
      setError("Có lỗi xảy ra khi kiểm chứng. Vui lòng thử lại.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" : "bg-gradient-to-br from-pink-50 via-white to-pink-50"}`}>
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className={`w-6 h-6 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
              <h1 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>Kiểm Chứng</h1>
            </div>
            <p className={`text-sm transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Xác minh thông tin với Google Search
            </p>
          </div>

          <div className="space-y-4">
            {/* Text Input */}
            <div>
              <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Tuyên Bố Cần Xác Minh
              </label>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Nhập tuyên bố cần kiểm chứng..."
                className={`w-full h-24 p-3 text-sm border rounded-lg focus:border-pink-500 focus:outline-none resize-none transition-colors duration-300 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "border-pink-100 bg-white"}`}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className={`block text-xs font-medium mb-1 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Hoặc Tải Lên Tệp ({files.length}/10)
              </label>
              
              {/* File List */}
              {files.length > 0 && (
                <div className="mb-2 space-y-1">
                  {files.map((file, idx) => (
                    <div key={idx} className={`flex items-center justify-between border rounded px-2 py-1.5 transition-colors duration-300 ${isDark ? "bg-pink-900/30 border-pink-700" : "bg-pink-50 border-pink-200"}`}>
                      <span className={`text-xs truncate flex-1 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {idx + 1}. {file.name}
                      </span>
                      <button
                        onClick={() => {
                          setFiles(files.filter((_, i) => i !== idx));
                        }}
                        className={`ml-2 text-lg font-bold transition-colors ${isDark ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-700"}`}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add File Button */}
              {files.length < 10 && (
                <div className={`relative border-2 border-dashed rounded-lg p-3 transition-colors cursor-pointer ${isDark ? "border-pink-800 hover:border-pink-600" : "border-pink-200 hover:border-pink-400"}`}>
                  <input
                    type="file"
                    onChange={(e) => {
                      const newFile = e.target.files?.[0];
                      if (newFile && files.length < 10) {
                        setFiles([...files, newFile]);
                        setClaim("");
                      }
                      e.target.value = "";
                    }}
                    accept=".pdf,.doc,.docx,.txt,.md"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    <Upload className={`w-5 h-5 mx-auto mb-1 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
                    <p className={`text-sm font-semibold transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-900"}`}>
                      {files.length > 0 ? "Thêm tệp" : "Chọn tệp"}
                    </p>
                    <p className={`text-xs transition-colors duration-300 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                      PDF, Word, TXT
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleFactCheck}
              disabled={loading || (!claim.trim() && files.length === 0)}
              className={`w-full text-white py-2.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm ${isDark ? "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 disabled:bg-gray-700" : "bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 disabled:bg-gray-300"}`}
            >
              {loading ? (
                <>Đang Xác Minh...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kiểm Chứng
                </>
              )}
            </button>

            {error && (
              <div className={`border px-3 py-2 rounded-lg text-sm transition-colors duration-300 ${isDark ? "bg-red-900/20 border-red-700 text-red-200" : "bg-red-50 border-red-300 text-red-700"}`}>
                {error}
              </div>
            )}

            {loading && <LoadingSpinner />}

            {result && !loading && (
              <div>
                <h2 className={`text-lg font-bold mb-2 transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                  Kết Quả Kiểm Chứng
                </h2>
                <div className={`border rounded-lg p-3 mb-3 transition-colors duration-300 ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-pink-100"}`}>
                  <MarkdownRenderer content={result} />
                </div>
                
                <div className={`border rounded-lg p-3 transition-colors duration-300 ${isDark ? "bg-yellow-900/20 border-yellow-700" : "bg-yellow-50 border-yellow-200"}`}>
                  <p className={`text-xs transition-colors duration-300 ${isDark ? "text-yellow-200" : "text-yellow-800"}`}>
                    <strong>Lưu Ý:</strong> Luôn xác minh thông tin quan trọng từ nhiều nguồn.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
