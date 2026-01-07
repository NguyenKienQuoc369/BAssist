import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BAssist - Trợ Lý AI Học Tập Của Bạn",
  description: "Công cụ học tập và năng suất được cung cấp bởi AI tiên tiến",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <ChatHistoryProvider>
            {children}
          </ChatHistoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
