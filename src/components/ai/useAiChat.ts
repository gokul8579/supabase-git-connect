import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ------------------ Types ------------------ */
type Msg = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

/* ------------------ Constants ------------------ */
const CHAT_STORAGE_KEY = "eduvanca_ai_chat";
const CHAT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/* ------------------ Hook ------------------ */
export function useAiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🔁 Load messages on mount (auto-expire old ones) */
  useEffect(() => {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return;

    try {
      const saved: Msg[] = JSON.parse(raw);
      const now = Date.now();

      const validMessages = saved.filter(
        (m) => now - m.timestamp < CHAT_TTL
      );

      setMessages(validMessages);

      if (validMessages.length > 0) {
        localStorage.setItem(
          CHAT_STORAGE_KEY,
          JSON.stringify(validMessages)
        );
      } else {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, []);

  /* 💾 Save messages whenever they change */
  useEffect(() => {
    if (messages.length === 0) return;

    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(messages)
    );
  }, [messages]);

  /* 💬 Send message */
  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Msg = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-reports", {
        body: { prompt: text },
      });

      const aiMsg: Msg = {
        role: "assistant",
        content: !error && data?.reply
          ? data.reply
          : "Sorry, I couldn’t respond right now.",
        timestamp: Date.now(),
      };

      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return {
    messages,
    input,
    setInput,
    sendMessage,
    loading,
  };
}
