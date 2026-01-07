"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface ChatHistory {
  id: string;
  feature: string;
  title: string;
  timestamp: number;
  preview: string;
  messages: any[]; // Full conversation messages
}

interface ChatHistoryContextType {
  histories: Record<string, ChatHistory[]>;
  addHistory: (feature: string, messages: any[]) => void;
  deleteHistory: (feature: string, id: string) => void;
  clearHistory: (feature: string) => void;
  loadHistory: (feature: string, id: string) => ChatHistory | null;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(
  undefined
);

export const ChatHistoryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [histories, setHistories] = useState<Record<string, ChatHistory[]>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (after hydration)
  useEffect(() => {
    const stored = localStorage.getItem("chatHistories");
    if (stored) {
      try {
        setHistories(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load chat histories:", err);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever histories change (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("chatHistories", JSON.stringify(histories));
    }
  }, [histories, isHydrated]);

  const addHistory = (feature: string, messages: any[]) => {
    if (!messages || messages.length === 0) return;

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const firstUserMessage = userMessages[0].content;
    const preview =
      firstUserMessage.substring(0, 50) +
      (firstUserMessage.length > 50 ? "..." : "");
    const title = firstUserMessage.substring(0, 30);

    const newHistory: ChatHistory = {
      id: Date.now().toString(),
      feature,
      title,
      timestamp: Date.now(),
      preview,
      messages: messages, // Store full conversation
    };

    setHistories((prev) => {
      const featureHistories = prev[feature] || [];
      return {
        ...prev,
        [feature]: [newHistory, ...featureHistories].slice(0, 20), // Keep last 20
      };
    });
  };

  const deleteHistory = (feature: string, id: string) => {
    setHistories((prev) => ({
      ...prev,
      [feature]: (prev[feature] || []).filter((h) => h.id !== id),
    }));
  };

  const clearHistory = (feature: string) => {
    setHistories((prev) => ({
      ...prev,
      [feature]: [],
    }));
  };

  const loadHistory = (feature: string, id: string): ChatHistory | null => {
    return (histories[feature] || []).find((h) => h.id === id) || null;
  };

  return (
    <ChatHistoryContext.Provider
      value={{ histories, addHistory, deleteHistory, clearHistory, loadHistory }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
};

export const useChatHistory = () => {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error(
      "useChatHistory must be used within ChatHistoryProvider"
    );
  }
  return context;
};
