import { motion } from "framer-motion";

export function ProductivityMeter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 92;
  const stroke = 14;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const label =
    clamped >= 75 ? "High" : clamped >= 45 ? "Medium" : "Low";

  const color =
    clamped >= 75
      ? "text-emerald-600"
      : clamped >= 45
      ? "text-amber-600"
      : "text-rose-600";

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="260" height="150" viewBox="0 0 260 150">
        <defs>
          <linearGradient id="prodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d="M 30 120 A 100 100 0 0 1 230 120"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Progress */}
        <motion.path
          d="M 30 120 A 100 100 0 0 1 230 120"
          fill="none"
          stroke="url(#prodGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>

      {/* Center Content */}
      <div className="absolute bottom-3 flex flex-col items-center">
        <div className={`text-4xl font-bold ${color}`}>
          {clamped}
        </div>
        <div className="text-sm text-slate-500">
          Productivity: <span className={color}>{label}</span>
        </div>
      </div>
    </div>
  );
}
