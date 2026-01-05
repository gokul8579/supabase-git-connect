import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const QUESTIONS = [
  "What are my biggest risks this week?",
  "Why is profit low despite sales?",
  "Which customers need follow-up?",
  "What should I focus on today?",
  "Any cash flow issues ahead?",
];

export function AiQuickQuestions({ onAsk }: { onAsk: (q: string) => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-3 text-sm font-medium w-full text-left"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Suggested Questions
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          {QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => onAsk(q)}
              className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
