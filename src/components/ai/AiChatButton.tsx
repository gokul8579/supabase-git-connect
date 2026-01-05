import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

export function AiChatButton({
  onClick,
  isChatOpen,
}: {
  onClick: () => void;
  isChatOpen: boolean;
}) {
  const [showPopup, setShowPopup] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔔 Handle initial + recurring popup logic
  useEffect(() => {
    if (isChatOpen) {
      setShowPopup(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 1️⃣ SHOW POPUP IMMEDIATELY ON PAGE LOAD / RELOAD
    setShowPopup(true);

    const hideTimeout = setTimeout(() => {
      setShowPopup(false);
    }, 6000); // auto-hide after 6s

    // 2️⃣ START 15 MIN INTERVAL FROM NOW
    intervalRef.current = setInterval(() => {
      setShowPopup(true);

      setTimeout(() => {
        setShowPopup(false);
      }, 6000);
    }, 15 * 60 * 1000);

    return () => {
      clearTimeout(hideTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isChatOpen]);

  return (
    <>
      {/* 🔹 Reminder Popup */}
      <AnimatePresence>
        {showPopup && !isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="
              fixed bottom-24 right-5 z-50
              max-w-[220px]
              rounded-lg
              bg-indigo-600/90
              text-white
              text-xs
              px-3 py-2
              shadow-lg
              backdrop-blur
            "
          >
            <div className="font-medium">Need any help? 👋</div>
            <div className="opacity-80">
              Use our Eduvanca AI
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤖 AI Button */}
      <motion.button
        onClick={onClick}
        className="
          fixed bottom-5 right-5 z-50
          h-14 w-14 rounded-full
          bg-indigo-600 hover:bg-indigo-700
          shadow-xl text-white
          flex items-center justify-center
        "
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{
            repeat: Infinity,
            repeatDelay: 3,
            duration: 0.6,
          }}
        >
          <Bot className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </>
  );
}
