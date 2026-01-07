"use client";

import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Database,
  CheckCircle,
  Heart,
  MessageCircle,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const features = [
  {
    name: "Chat Thông Thường",
    description: "Trò chuyện tự do với AI về bất cứ điều gì",
    icon: MessageCircle,
    href: "/chat",
    light: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    dark: "bg-indigo-900/20 hover:bg-indigo-900/30 border-indigo-700/50",
  },
  {
    name: "Bạn Học Tập",
    description: "Tóm tắt văn bản và PDF ngay lập tức để học hiệu quả",
    icon: BookOpen,
    href: "/study-buddy",
    light: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    dark: "bg-blue-900/20 hover:bg-blue-900/30 border-blue-700/50",
  },
  {
    name: "Trau Chuốt Văn Bản",
    description: "Giúp văn bản của bạn chuyên nghiệp hơn",
    icon: Sparkles,
    href: "/polisher",
    light: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    dark: "bg-purple-900/20 hover:bg-purple-900/30 border-purple-700/50",
  },
  {
    name: "Bác Sĩ Cá Nhân",
    description: "Tư vấn sức khỏe và chăm sóc cá nhân hóa",
    icon: Heart,
    href: "/personal-doctor",
    light: "bg-red-50 hover:bg-red-100 border-red-200",
    dark: "bg-red-900/20 hover:bg-red-900/30 border-red-700/50",
  },
  {
    name: "Kiểm Chứng",
    description: "Xác minh thông tin bằng AI hỗ trợ tìm kiếm Google",
    icon: CheckCircle,
    href: "/fact-check",
    light: "bg-pink-50 hover:bg-pink-100 border-pink-200",
    dark: "bg-pink-900/20 hover:bg-pink-900/30 border-pink-700/50",
  },
];

export default function Home() {
  const { isDark, toggleDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`flex min-h-screen transition-all duration-500 flex-col md:flex-row ${
      isDark
        ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
        : "bg-gradient-to-br from-pink-50 via-white to-pink-50"
    }`}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 md:hidden z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className={`md:hidden flex items-center justify-between px-4 py-4 border-b transition-colors duration-300 ${
        isDark 
          ? "bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700" 
          : "bg-gradient-to-r from-white to-pink-50 border-pink-200"
      }`}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`p-2 rounded-lg transition-colors duration-300 ${
            isDark
              ? "text-gray-300 hover:bg-gray-800"
              : "text-gray-600 hover:bg-pink-100"
          }`}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
        <h1 className={`text-lg font-bold bg-gradient-to-r from-pink-500 to-pink-400 bg-clip-text text-transparent`}>
          BAssist
        </h1>
        <div className="w-10"></div>
      </div>

      <Sidebar />

      <main className={`flex-1 p-4 md:p-8 overflow-auto transition-colors duration-300 ${
        isDark ? "text-gray-100" : "text-gray-900"
      }`}>
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-12 md:mb-16 text-center py-6 md:py-12">
            <div className="mb-6 md:mb-8 inline-block">
              <div className={`bg-gradient-to-r from-pink-500 to-pink-400 rounded-full p-0.5 ${
                isDark ? "shadow-lg shadow-pink-600/30" : "shadow-lg shadow-pink-300/30"
              }`}>
                <div className={`${isDark ? "bg-gray-800/90" : "bg-white/90"} px-4 md:px-6 py-1.5 md:py-2 rounded-full transition-colors duration-300 backdrop-blur-sm`}>
                  <span className={`text-xs md:text-sm font-bold flex items-center gap-1 ${
                    isDark ? "text-pink-300" : "text-pink-600"
                  }`}>✨ Trợ lý AI dành riêng cho cá nhân</span>
                </div>
              </div>
            </div>
            <h1 className={`text-3xl md:text-5xl lg:text-7xl font-bold mb-6 md:mb-8 leading-relaxed transition-all duration-300 ${
              isDark
                ? "bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 bg-clip-text text-transparent"
                : "bg-gradient-to-r from-gray-900 via-pink-600 to-pink-500 bg-clip-text text-transparent"
            }`}>
              Welcome to BAssist 
            </h1>
            <p className={`text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-8 md:mb-12 mt-6 md:mt-8 transition-colors duration-300 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}>
              Trợ lý AI học tập thông minh của bạn. Tăng năng suất với các công cụ AI tiên tiến 
              được thiết kế cho học sinh, chuyên gia và doanh nhân.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-pink-300/30 transition-all duration-300 hover:scale-105 text-sm md:text-base"
            >
              Bắt đầu ngay <ArrowRight className="w-4 md:w-5 h-4 md:h-5" />
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-12">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.name}
                  href={feature.href}
                  className={`${isDark ? feature.dark : feature.light} border-2 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 group`}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 md:p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 ${
                      isDark ? "bg-gray-800" : "bg-white"
                    }`}>
                      <Icon className="w-5 md:w-6 h-5 md:h-6 text-pink-500" />
                    </div>
                    <ArrowRight className={`w-4 md:w-5 h-4 md:h-5 group-hover:translate-x-1 transition-all duration-300 ${
                      isDark ? "text-gray-500 group-hover:text-pink-400" : "text-gray-400 group-hover:text-pink-600"
                    }`} />
                  </div>
                  <h3 className={`text-base md:text-lg font-bold mb-2 group-hover:text-pink-500 transition-colors ${
                    isDark ? "text-gray-100" : "text-gray-900"
                  }`}>
                    {feature.name}
                  </h3>
                  <p className={`text-xs md:text-sm leading-relaxed ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}>{feature.description}</p>
                </Link>
              );
            })}
          </div>

          {/* Info Section */}
          <div className={`rounded-2xl p-8 md:p-12 text-center shadow-xl transition-all duration-300 ${
            isDark
              ? "bg-gradient-to-r from-pink-900/40 via-pink-800/40 to-pink-900/40 text-gray-100 border border-pink-700/30"
              : "bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 text-white"
          }`}>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Sẵn sàng bắt đầu?</h2>
            <p className={`text-sm md:text-base mb-6 ${isDark ? "text-gray-300" : "text-pink-100"}`}>Chọn một tính năng từ trên để bắt đầu nâng cao năng suất của bạn với AI</p>
            <div className={`w-12 h-1 rounded-full mx-auto ${
              isDark ? "bg-pink-500/50" : "bg-white/30"
            }`}></div>
          </div>

          {/* Footer */}
          <div className={`mt-12 md:mt-16 pt-6 md:pt-8 border-t transition-colors duration-300 ${
            isDark ? "border-gray-700" : "border-pink-200"
          }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className={`text-xs md:text-sm transition-colors duration-300 text-center md:text-left ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}>
                Made with <span className="text-pink-500">♥</span> by NguyenKienQuoc
              </p>
              <button
                onClick={toggleDarkMode}
                className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 ${
                  isDark
                    ? "bg-gray-800 text-yellow-300 hover:bg-gray-700 border border-gray-700"
                    : "bg-pink-100 text-purple-700 hover:bg-pink-200 border border-pink-300"
                }`}
              >
                {isDark ? (
                  <>
                    <span>☀️</span>
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <span>🌙</span>
                    <span>Dark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
