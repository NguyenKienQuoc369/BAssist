"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { Database, Plus, Trash2, AlertCircle, X, Upload, Eye, Download, FileText } from "lucide-react";

interface KnowledgeBase {
  name: string;
  document_count: number;
}

interface Document {
  id: number;
  filename: string;
  text_preview: string;
  text_length: number;
}

export default function KnowledgeBases() {
  const { isDark } = useTheme();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newKbName, setNewKbName] = useState("");
  const [creatingKb, setCreatingKb] = useState(false);
  const [uploadingTo, setUploadingTo] = useState<string>("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [viewingKb, setViewingKb] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Load knowledge bases
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/knowledge-bases");
      const data = await response.json();
      setKbs(data.knowledge_bases || []);
      setError("");
    } catch (err) {
      setError("Không thể tải danh sách kho dữ liệu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) {
      setError("Vui lòng nhập tên kho dữ liệu");
      return;
    }

    try {
      setCreatingKb(true);
      const formData = new FormData();
      formData.append(
        "request",
        JSON.stringify({ name: newKbName })
      );

      const response = await fetch("/api/knowledge-bases/create", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể tạo kho dữ liệu");
      }

      setNewKbName("");
      await loadKnowledgeBases();
      setError("");
    } catch (err) {
      setError("Có lỗi xảy ra khi tạo kho dữ liệu");
      console.error(err);
    } finally {
      setCreatingKb(false);
    }
  };

  const handleDeleteKb = async (name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa kho dữ liệu "${name}"?`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("request", JSON.stringify({ name }));

      const response = await fetch("/api/knowledge-bases/delete", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể xóa kho dữ liệu");
      }

      await loadKnowledgeBases();
      setError("");
    } catch (err) {
      setError("Có lỗi xảy ra khi xóa kho dữ liệu");
      console.error(err);
    }
  };

  const handleClearKb = async (name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tất cả tài liệu trong kho "${name}"?`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("request", JSON.stringify({ name }));

      const response = await fetch("/api/knowledge-bases/clear", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể xóa tài liệu");
      }

      await loadKnowledgeBases();
      setError("");
    } catch (err) {
      setError("Có lỗi xảy ra khi xóa tài liệu");
      console.error(err);
    }
  };

  const handleUploadFiles = async (kbName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploadingTo(kbName);
      const formData = new FormData();
      
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      
      formData.append("request", JSON.stringify({ name: kbName }));

      const response = await fetch("/api/knowledge-bases/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể upload file");
      }

      const data = await response.json();
      await loadKnowledgeBases();
      setError("");
      alert(`Đã upload thành công ${data.uploaded_count} tài liệu!`);
    } catch (err) {
      setError("Có lỗi xảy ra khi upload file");
      console.error(err);
    } finally {
      setUploadingTo("");
    }
  };

  const handleViewKb = async (kbName: string) => {
    setViewingKb(kbName);
    setLoadingDocs(true);
    try {
      const response = await fetch(`/api/knowledge-bases/${encodeURIComponent(kbName)}/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
      setError("Không thể tải danh sách tài liệu");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (kbName: string, docId: number) => {
    if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) return;
    
    try {
      const response = await fetch(`/api/knowledge-bases/${encodeURIComponent(kbName)}/documents/${docId}`, {
        method: "POST",
      });
      
      if (response.ok) {
        // Reload documents
        handleViewKb(kbName);
        // Reload KB list to update document count
        loadKnowledgeBases();
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Không thể xóa tài liệu");
    }
  };

  const handleDownloadDocument = async (kbName: string, docId: number, filename: string) => {
    try {
      const response = await fetch(`/api/knowledge-bases/${encodeURIComponent(kbName)}/documents/${docId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        // Create a blob and download
        const blob = new Blob([data.document.text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "document.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error downloading document:", err);
      setError("Không thể tải về tài liệu");
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" : "bg-gradient-to-br from-pink-50 via-white to-pink-50"}`}>
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <div className={`p-4 border-b transition-colors duration-300 ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <Database className={`w-6 h-6 ${isDark ? "text-pink-400" : "text-primary"}`} />
            <h1 className={`text-2xl font-bold transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>Kho Dữ Liệu</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Create New KB */}
            <div className={`rounded-lg border p-6 mb-6 transition-colors duration-300 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <h2 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Tạo Kho Dữ Liệu Mới
              </h2>
              <form onSubmit={handleCreateKb} className="flex gap-2">
                <input
                  type="text"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="Nhập tên kho dữ liệu..."
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none transition-colors duration-300 ${isDark ? "bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-pink-500" : "border-gray-300 focus:border-primary"}`}
                  disabled={creatingKb}
                />
                <button
                  type="submit"
                  disabled={creatingKb || !newKbName.trim()}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${isDark ? "bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700" : "bg-primary hover:bg-pink-600 disabled:bg-gray-300"} disabled:cursor-not-allowed`}
                >
                  <Plus className="w-4 h-4" />
                  Tạo
                </button>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`border rounded-lg p-4 mb-6 flex items-start gap-3 transition-colors duration-300 ${isDark ? "bg-red-900/20 border-red-700 text-red-200" : "bg-red-50 border-red-200 text-red-600"}`}>
                <X className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? "text-red-400" : "text-red-600"}`} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Knowledge Bases List */}
            <div>
              <h2 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                Danh Sách Kho Dữ Liệu ({kbs.length})
              </h2>

              {loading ? (
                <div className={`text-center py-8 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Đang tải...
                </div>
              ) : kbs.length === 0 ? (
                <div className={`text-center py-8 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Chưa có kho dữ liệu nào. Hãy tạo một kho mới!
                </div>
              ) : (
                <div className="space-y-3">
                  {kbs.map((kb) => (
                    <div
                      key={kb.name}
                      className={`border rounded-lg p-4 flex items-center justify-between transition-all duration-300 ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-800/80" : "bg-white border-gray-200 hover:shadow-sm"}`}
                    >
                      <div>
                        <h3 className={`font-medium transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>{kb.name}</h3>
                        <p className={`text-sm transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {kb.document_count} tài liệu
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* View Documents Button */}
                        <button
                          onClick={() => handleViewKb(kb.name)}
                          className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${isDark ? "text-blue-400 hover:bg-blue-900/30" : "text-blue-600 hover:bg-blue-50"}`}
                          title="Xem tài liệu"
                        >
                          <Eye className="w-4 h-4" />
                          Xem
                        </button>
                        
                        {/* Upload Button */}
                        <label
                          className={`px-3 py-1 text-sm rounded transition-colors cursor-pointer flex items-center gap-1 ${uploadingTo === kb.name ? "opacity-50 cursor-not-allowed" : isDark ? "text-green-400 hover:bg-green-900/30" : "text-green-600 hover:bg-green-50"}`}
                          title="Upload tài liệu"
                        >
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.md"
                            onChange={(e) => handleUploadFiles(kb.name, e.target.files)}
                            disabled={uploadingTo === kb.name}
                            className="hidden"
                          />
                          <Upload className="w-4 h-4" />
                          {uploadingTo === kb.name ? "Đang tải..." : "Upload"}
                        </label>
                        <button
                          onClick={() => handleClearKb(kb.name)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${isDark ? "text-yellow-400 hover:bg-yellow-900/30" : "text-yellow-600 hover:bg-yellow-50"}`}
                          title="Xóa tất cả tài liệu"
                        >
                          Xóa Tài Liệu
                        </button>
                        <button
                          onClick={() => handleDeleteKb(kb.name)}
                          className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${isDark ? "text-red-400 hover:bg-red-900/30" : "text-red-600 hover:bg-red-50"}`}
                          title="Xóa kho dữ liệu"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Document Viewer Modal */}
      {viewingKb && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-4xl w-full max-h-[80vh] rounded-xl shadow-2xl flex flex-col transition-colors duration-300 ${isDark ? "bg-gray-900 border border-gray-700" : "bg-white"}`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between transition-colors duration-300 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
                <h2 className={`text-xl font-bold transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                  {viewingKb}
                </h2>
                <span className={`text-sm transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  ({documents.length} tài liệu)
                </span>
              </div>
              <button
                onClick={() => setViewingKb(null)}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingDocs ? (
                <div className={`text-center py-8 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Đang tải...
                </div>
              ) : documents.length === 0 ? (
                <div className={`text-center py-8 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Chưa có tài liệu nào trong kho này
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`border rounded-lg p-4 transition-all duration-300 ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-800/80" : "bg-gray-50 border-gray-200 hover:shadow-sm"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-pink-400" : "text-pink-600"}`} />
                            <h3 className={`font-medium truncate transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
                              {doc.filename || `Document ${doc.id}`}
                            </h3>
                          </div>
                          <p className={`text-xs mb-2 transition-colors duration-300 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {doc.text_length} ký tự
                          </p>
                          <p className={`text-sm line-clamp-2 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {doc.text_preview}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDownloadDocument(viewingKb, doc.id, doc.filename)}
                            className={`p-2 rounded transition-colors ${isDark ? "text-blue-400 hover:bg-blue-900/30" : "text-blue-600 hover:bg-blue-50"}`}
                            title="Tải về"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(viewingKb, doc.id)}
                            className={`p-2 rounded transition-colors ${isDark ? "text-red-400 hover:bg-red-900/30" : "text-red-600 hover:bg-red-50"}`}
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
