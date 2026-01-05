import { motion } from "framer-motion";

const RED = "249,66,58"; // #F9423A

export const OnboardingBg = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Red gradient glow */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[rgba(249,66,58,0.25)] blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-[rgba(249,66,58,0.18)] blur-[140px]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Money symbol */}
        <FloatingText x={200} y={140} text="₹" size={42} />

        {/* #1 badge */}
        <FloatingText x={950} y={160} text="#1" size={28} delay={0.4} />

        {/* Shop */}
        <FloatingIcon delay={0.2}>
          <ShopIcon x={120} y={360} />
        </FloatingIcon>

        {/* Product box */}
        <FloatingIcon delay={0.5}>
          <BoxIcon x={520} y={120} />
        </FloatingIcon>

        {/* Truck */}
        <FloatingIcon delay={0.8}>
          <TruckIcon x={820} y={420} />
        </FloatingIcon>
        {/* EXTRA BUSINESS ELEMENTS AROUND */}

{/* Money stack */}
<FloatingIcon delay={1.2}>
  <MoneyStack x={80} y={200} />
</FloatingIcon>

{/* Bar chart */}
<FloatingIcon delay={1.6}>
  <BarChartIcon x={1000} y={260} />
</FloatingIcon>

{/* Discount tag */}
<FloatingIcon delay={2}>
  <TagIcon x={900} y={520} />
</FloatingIcon>

{/* Warehouse */}
<FloatingIcon delay={1.4}>
  <WarehouseIcon x={140} y={540} />
</FloatingIcon>

{/* Extra product box (top-right, partially hidden) */}
<FloatingIcon delay={2.4}>
  <BoxIcon x={1080} y={80} />
</FloatingIcon>

{/* Extra rupee */}
<FloatingText x={60} y={420} text="₹" size={30} delay={1.8} />


        {/* Connecting lines */}
        <AnimatedLine x1={250} y1={160} x2={520} y2={140} />
        <AnimatedLine x1={560} y1={160} x2={820} y2={420} delay={0.4} />
        <AnimatedLine x1={200} y1={390} x2={520} y2={160} delay={0.7} />
      </svg>
    </div>
  );
};

/* ----------------- Helpers ----------------- */

const FloatingIcon = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.g
    animate={{ y: [0, -12, 0] }}
    transition={{
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {children}
  </motion.g>
);

const FloatingText = ({
  x,
  y,
  text,
  size,
  delay = 0,
}: {
  x: number;
  y: number;
  text: string;
  size: number;
  delay?: number;
}) => (
  <motion.text
    x={x}
    y={y}
    fontSize={size}
    fontWeight="700"
    fill={`rgba(${RED},0.35)`}
    animate={{ y: [y, y - 10, y] }}
    transition={{
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {text}
  </motion.text>
);

const AnimatedLine = ({
  x1,
  y1,
  x2,
  y2,
  delay = 0,
}: any) => (
  <motion.line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={`rgba(${RED},0.25)`}
    strokeWidth="1"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{
      duration: 3,
      repeat: Infinity,
      repeatType: "mirror",
      delay,
    }}
  />
);

/* ----------------- Icons ----------------- */

const ShopIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width="70" height="50" rx="6" fill={`rgba(${RED},0.18)`} />
    <rect y="-14" width="70" height="14" rx="4" fill={`rgba(${RED},0.35)`} />
  </g>
);

const BoxIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width="60" height="60" rx="6" fill={`rgba(${RED},0.18)`} />
    <line
      x1="30"
      y1="0"
      x2="30"
      y2="60"
      stroke={`rgba(${RED},0.35)`}
    />
  </g>
);

const TruckIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width="80" height="36" rx="6" fill={`rgba(${RED},0.18)`} />
    <rect x="80" y="10" width="26" height="26" rx="4" fill={`rgba(${RED},0.3)`} />
    <circle cx="20" cy="40" r="6" fill={`rgba(${RED},0.45)`} />
    <circle cx="60" cy="40" r="6" fill={`rgba(${RED},0.45)`} />
  </g>
);


const MoneyStack = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width="48" height="14" rx="4" fill={`rgba(${RED},0.35)`} />
    <rect y="10" width="48" height="14" rx="4" fill={`rgba(${RED},0.25)`} />
    <rect y="20" width="48" height="14" rx="4" fill={`rgba(${RED},0.18)`} />
  </g>
);

const BarChartIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="0" y="24" width="10" height="30" fill={`rgba(${RED},0.3)`} />
    <rect x="16" y="14" width="10" height="40" fill={`rgba(${RED},0.35)`} />
    <rect x="32" y="4" width="10" height="50" fill={`rgba(${RED},0.45)`} />
  </g>
);

const TagIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y}) rotate(-12)`}>
    <path
      d="M0 10 L30 0 L60 20 L30 40 Z"
      fill={`rgba(${RED},0.25)`}
    />
    <circle cx="18" cy="18" r="3" fill={`rgba(${RED},0.5)`} />
  </g>
);

const WarehouseIcon = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width="70" height="40" rx="6" fill={`rgba(${RED},0.18)`} />
    <rect y="-16" width="70" height="16" rx="4" fill={`rgba(${RED},0.35)`} />
    <line
      x1="10"
      y1="0"
      x2="10"
      y2="40"
      stroke={`rgba(${RED},0.25)`}
    />
    <line
      x1="35"
      y1="0"
      x2="35"
      y2="40"
      stroke={`rgba(${RED},0.25)`}
    />
    <line
      x1="60"
      y1="0"
      x2="60"
      y2="40"
      stroke={`rgba(${RED},0.25)`}
    />
  </g>
);
