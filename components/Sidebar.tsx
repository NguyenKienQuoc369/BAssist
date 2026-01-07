"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  Database,
  CheckCircle,
  Home,
  MessageCircle,
  Heart,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const navigation = [
  { name: "Trang Chủ", href: "/", icon: Home },
  { name: "Chat", href: "/chat", icon: MessageCircle },
  { name: "Tóm tắt", href: "/study-buddy", icon: BookOpen },
  { name: "Trau Chuốt VB", href: "/polisher", icon: Sparkles },
  { name: "Sức  khỏe", href: "/personal-doctor", icon: Heart },
  { name: "Kho Dữ Liệu", href: "/knowledge-bases", icon: Database },
  { name: "Kiểm Chứng", href: "/fact-check", icon: CheckCircle },
];

function SidebarContent() {
  const pathname = usePathname();
  const { isDark, toggleDarkMode } = useTheme();

  return (
    <div className={`w-64 md:w-64 min-h-screen p-4 md:p-6 flex flex-col sticky top-0 transition-colors duration-300 hidden md:flex ${
      isDark
        ? "bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-r border-pink-700"
        : "bg-gradient-to-b from-white via-pink-50 to-white border-r border-pink-100"
    }`}>
      {/* Logo Section */}
      <div className="mb-8 md:mb-10">
        <h1 className={`text-xl md:text-2xl font-bold mb-1 transition-colors duration-300 ${
          isDark
            ? "bg-gradient-to-r from-pink-400 to-pink-300 bg-clip-text text-transparent"
            : "bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent"
        }`}>BAssist</h1>
        <p className={`text-xs transition-colors duration-300 ${
          isDark ? "text-pink-500/70" : "text-pink-500/60"
        }`}>Trợ Lý AI Học Tập</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all duration-300 group relative ${
                isActive
                  ? isDark
                    ? "bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-900/50"
                    : "bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-lg shadow-pink-200"
                  : isDark
                  ? "text-gray-300 hover:text-pink-400 hover:bg-gray-800/50"
                  : "text-gray-600 hover:text-pink-600 hover:bg-pink-50"
              }`}
            >
              {isActive && (
                <div className={`absolute inset-0 rounded-lg opacity-10 -z-10 blur-sm ${
                  isDark
                    ? "bg-gradient-to-r from-pink-600 to-pink-500"
                    : "bg-gradient-to-r from-pink-500 to-pink-400"
                }`}></div>
              )}
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <div className={`py-3 md:py-4 px-2 md:px-3 rounded-lg transition-colors duration-300 mb-4 ${
        isDark ? "bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-600" : "bg-gradient-to-r from-pink-200 to-pink-100 border border-pink-300"
      }`}>
        <button
          onClick={toggleDarkMode}
          className={`w-full flex items-center justify-center gap-2 py-2 px-2 md:px-3 rounded-lg font-medium transition-all duration-300 text-xs md:text-sm ${
            isDark
              ? "text-yellow-300 hover:text-yellow-200 hover:bg-gray-600/50"
              : "text-purple-700 hover:text-purple-800 hover:bg-pink-300/50"
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4" />
              <span className="text-sm">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span className="text-sm">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className={`pt-3 md:pt-4 border-t transition-colors duration-300 ${
        isDark ? "border-gray-800" : "border-pink-100"
      }`}>
        <p className={`text-xs text-center leading-relaxed transition-colors duration-300 ${
          isDark ? "text-gray-500" : "text-gray-500"
        }`}>
          Made with <span className="text-pink-500">♥</span> by NguyenKienQuoc
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return <SidebarContent />;
}
