import { X, Send } from "lucide-react";
import { useAiChat } from "./useAiChat";
import { AiQuickQuestions } from "./AiQuickQuestions";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";


const AI_LAST_USED_KEY = "eduvanca_ai_last_used";
const GREETING_COOLDOWN = 30 * 60 * 1000; // 30 minutes



export function AiChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, input, setInput, sendMessage, loading } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showGreetingFlow, setShowGreetingFlow] = useState(false);
const [showIntroTyping, setShowIntroTyping] = useState(false);
const [showIntroMessage, setShowIntroMessage] = useState(false);



useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, loading]);

useEffect(() => {
  const lastUsed = localStorage.getItem(AI_LAST_USED_KEY);
  const now = Date.now();

  if (!lastUsed || now - Number(lastUsed) > GREETING_COOLDOWN) {
    setShowGreetingFlow(true);
  } else {
    setShowGreetingFlow(false);
  }

  // update last used time whenever panel opens
  localStorage.setItem(AI_LAST_USED_KEY, now.toString());
}, []);


useEffect(() => {
  if (!showGreetingFlow) return;

  setShowIntroTyping(true);
  setShowIntroMessage(false);

  const typingTimer = setTimeout(() => {
    setShowIntroTyping(false);
    setShowIntroMessage(true);
  }, 1200);

  return () => clearTimeout(typingTimer);
}, [showGreetingFlow]);




  return (
    <div className="
      fixed bottom-0 right-0 z-50
      h-[85vh] w-[360px]
      bg-white border-l shadow-xl
      flex flex-col
    ">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Eduvanca AI Assistant</h3>
        <button onClick={onClose}>
          <X />
        </button>
      </div>

      {/* Quick Questions */}
      <AiQuickQuestions onAsk={sendMessage} />

      {/* Messages */}
      <div
  className="
    flex-1 overflow-y-auto p-4 space-y-3
    bg-[#f5f5f5]
    bg-[linear-gradient(45deg,rgba(0,0,0,0.02)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.02)_75%,transparent_75%,transparent)]
    bg-[length:24px_24px]
  "
>

  {/* Intro typing animation */}
{showGreetingFlow && showIntroTyping && (
  <div className="bg-white w-fit px-4 py-2 rounded-lg shadow-sm">
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  </div>
)}

{showGreetingFlow && showIntroMessage && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className="
      bg-white
      max-w-[85%]
      p-3
      rounded-lg
      shadow-sm
      text-sm
    "
  >
    <div className="font-medium">Hi 👋 I’m Eduvanca AI</div>
    <div className="text-gray-500 text-xs mt-1">
      How can I help you today?
    </div>
  </motion.div>
)}



  {messages.map((m, i) => (
    <div
      key={i}
      className={`text-sm p-3 rounded-lg max-w-[85%]
        ${m.role === "user"
          ? "bg-[#dcf8c6] text-black ml-auto"
          : "bg-white shadow-sm"
        }`}
    >
      {m.content}
    </div>
  ))}

  {loading && (
    <div className="text-sm bg-white shadow-sm p-3 rounded-lg w-fit animate-pulse">
      AI is thinking<span className="ml-1 animate-bounce">...</span>
    </div>
  )}

  <div ref={bottomRef} />
</div>


      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }}
  placeholder="Ask something..."
  className="flex-1 border rounded px-3 py-2 text-sm"
/>

        <button
  onClick={() => sendMessage(input)}
  disabled={loading}
  className={`px-3 rounded text-white ${
    loading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
  }`}
>
  <Send size={16} />
</button>
      </div>
    </div>
  );
}
