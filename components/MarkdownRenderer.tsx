"use client";

import ReactMarkdown from "react-markdown";
import { useTheme } from "@/contexts/ThemeContext";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { isDark } = useTheme();

  return (
    <div className={`markdown-content rounded-lg ${
      isDark
        ? "bg-gray-800/30 text-gray-100"
        : "bg-white/30 text-gray-900"
    }`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
