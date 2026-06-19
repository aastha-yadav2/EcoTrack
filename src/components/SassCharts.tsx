import React, { useState, useEffect, useRef } from "react";
import { Activity } from "../types";

// Types for chart data
interface DataPoint {
  label: string;
  value: number;
}

// Custom Tooltip component
interface TooltipProps {
  x: number;
  y: number;
  visible: boolean;
  content: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ x, y, visible, content }) => {
  if (!visible) return null;
  return (
    <div
      className="absolute z-30 pointer-events-none rounded-lg bg-slate-900/95 text-slate-100 p-2 text-xs font-mono shadow-xl border border-emerald-500/30 -translate-x-1/2 -translate-y-full mb-3 transition-all duration-150"
      style={{ left: x, top: y }}
    >
      {content}
    </div>
  );
};

// 1. Curved Area Line Chart: Trend Graph
export const TrendLineChart: React.FC<{ activities: Activity[]; isDark: boolean }> = ({ activities, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [height] = useState(220);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipState, setTooltipState] = useState({ x: 0, y: 0, visible: false, content: "" });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.max(280, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute daily totals for the last 7 days
  const getTrendData = (): DataPoint[] => {
    const data: { [key: string]: number } = {};
    const now = new Date();
    // Pre-populate last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const str = d.toLocaleDateString("en-US", { weekday: "short" });
      data[str] = 0;
    }

    activities.forEach((act) => {
      const actDate = new Date(act.timestamp);
      const dayStr = actDate.toLocaleDateString("en-US", { weekday: "short" });
      if (data[dayStr] !== undefined) {
        data[dayStr] += act.carbonAmount;
      }
    });

    return Object.entries(data).map(([label, value]) => ({
      label,
      value: parseFloat(value.toFixed(1))
    }));
  };

  const dataPoints = getTrendData();
  const maxVal = Math.max(...dataPoints.map((dp) => dp.value), 10);
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };

  // Generate SVG coordinates
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = dataPoints.map((dp, i) => {
    const x = padding.left + (i / (dataPoints.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (dp.value / maxVal) * chartHeight;
    return { x, y, dp, originalIndex: i };
  });

  // SVG path definitions
  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    // Generate curved bezier line
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cpX1 = p1.x + chartWidth / (dataPoints.length - 1) / 2;
      const cpY1 = p1.y;
      const cpX2 = p2.x - chartWidth / (dataPoints.length - 1) / 2;
      const cpY2 = p2.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p2.x} ${p2.y}`;
    }

    // Complete area Path for gradient backdrop
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const itemWidth = chartWidth / (dataPoints.length - 1);
    const approxIndex = Math.round((x - padding.left) / itemWidth);

    if (approxIndex >= 0 && approxIndex < points.length) {
      const pt = points[approxIndex];
      setHoverIndex(approxIndex);
      setTooltipState({
        x: pt.x,
        y: pt.y,
        visible: true,
        content: `${pt.dp.label}: ${pt.dp.value} kg CO2e`
      });
    } else {
      setHoverIndex(null);
      setTooltipState((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltipState((prev) => ({ ...prev, visible: false }));
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden select-none" id="carbon-trend-chart-container">
      <Tooltip x={tooltipState.x} y={tooltipState.y} visible={tooltipState.visible} content={tooltipState.content} />
      <svg
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="overflow-visible"
        aria-label="Interactive carbon footprint trend graph for the past week"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((ratio, idx) => {
          const y = padding.top + chartHeight * ratio;
          const valLabel = Math.round(maxVal * (1 - ratio));
          return (
            <g key={idx} className="opacity-20">
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? "#94a3b8" : "#475569"}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Area Flow Background */}
        <path d={areaPath} fill="url(#trendGradient)" />

        {/* Emission curve line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGlow)"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* X Axis Labels */}
        {points.map((pt, idx) => (
          <text
            key={idx}
            x={pt.x}
            y={height - padding.bottom + 18}
            textAnchor="middle"
            className="text-[11px] font-sans font-medium fill-slate-500 dark:fill-slate-400"
          >
            {pt.dp.label}
          </text>
        ))}

        {/* Interactive glow nodes */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === idx ? 8 : 4}
              fill={hoverIndex === idx ? "#10b981" : isDark ? "#0f172a" : "#ffffff"}
              stroke="#10b981"
              strokeWidth="2.5"
              className="cursor-pointer transition-all duration-200"
            />
            {hoverIndex === idx && (
              <circle
                cx={pt.x}
                cy={pt.y}
                r={16}
                fill="#10b981"
                fillOpacity="0.15"
                className="animate-ping"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};


// 2. Weekly Emissions Comparison Chart (Two Parallel Rounded SVG Column Bars)
export const WeeklyBarChart: React.FC<{ activities: Activity[]; isDark: boolean }> = ({ activities, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [height] = useState(220);
  const [activeBar, setActiveBar] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.max(280, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute stats of categories
  const getCategoryStats = () => {
    const totals = { transport: 0, electricity: 0, food: 0, shopping: 0 };
    activities.forEach((a) => {
      if (totals[a.category] !== undefined) {
        totals[a.category] += a.carbonAmount;
      }
    });
    return totals;
  };

  const cats = getCategoryStats();
  const barsData = [
    { label: "Transport", value: parseFloat(cats.transport.toFixed(1)), color: "#10b981", bgGlow: "rgba(16, 185, 129, 0.4)" },
    { label: "Electricity", value: parseFloat(cats.electricity.toFixed(1)), color: "#06b6d4", bgGlow: "rgba(6, 182, 212, 0.4)" },
    { label: "Food Diet", value: parseFloat(cats.food.toFixed(1)), color: "#f59e0b", bgGlow: "rgba(245, 158, 11, 0.4)" },
    { label: "Shopping", value: parseFloat(cats.shopping.toFixed(1)), color: "#ec4899", bgGlow: "rgba(236, 72, 153, 0.4)" }
  ];

  const maxVal = Math.max(...barsData.map((b) => b.value), 10);
  const padding = { left: 40, right: 10, top: 20, bottom: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <div ref={containerRef} className="w-full h-full relative" id="category-bar-chart">
      <svg width={width} height={height} className="overflow-visible" aria-label="Emissions Comparison by Category">
        {/* Grids */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * ratio;
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
              strokeWidth="1"
            />
          );
        })}

        {barsData.map((bar, idx) => {
          const colWidth = Math.min(48, chartWidth / 4 - 20);
          const gap = (chartWidth - colWidth * 4) / 5;
          const x = padding.left + gap + idx * (colWidth + gap);
          const barHeight = (bar.value / maxVal) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setActiveBar(idx)}
              onMouseLeave={() => setActiveBar(null)}
            >
              {/* Background trace bar */}
              <rect
                x={x}
                y={padding.top}
                width={colWidth}
                height={chartHeight}
                fill={isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"}
                rx="6"
              />

              {/* Glowing active outline */}
              {activeBar === idx && (
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={colWidth + 4}
                  height={barHeight + 4}
                  fill="none"
                  stroke={bar.color}
                  strokeOpacity="0.3"
                  strokeWidth="2"
                  rx="8"
                />
              )}

              {/* Carbon value filled bar */}
              <rect
                x={x}
                y={y}
                width={colWidth}
                height={Math.max(barHeight, 4)}
                fill={bar.color}
                fillOpacity={activeBar === idx ? 0.95 : 0.75}
                rx="6"
                className="transition-all duration-300"
              />

              {/* Indicator values above bars */}
              <text
                x={x + colWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="text-[10px] font-mono font-semibold fill-slate-600 dark:fill-slate-300"
              >
                {bar.value} kg
              </text>

              {/* Category labels below */}
              <text
                x={x + colWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="text-[11px] font-sans font-medium fill-slate-500 dark:fill-slate-400"
              >
                {bar.label.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};


// 3. Category Donut Representation (Trigonometric SVG Circle Slices with Click Selector)
export const CategoryDonutChart: React.FC<{ activities: Activity[]; onSelectCategory: (cat: string) => void }> = ({ activities, onSelectCategory }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const getBreakdown = () => {
    let totals = { transport: 0, electricity: 0, food: 0, shopping: 0 };
    activities.forEach((act) => {
      if (totals[act.category] !== undefined) {
        totals[act.category] += act.carbonAmount;
      }
    });

    const grandTotal = Math.max(0.1, Object.values(totals).reduce((a, b) => a + b, 0));
    return [
      { name: "transport", label: "Transport", val: totals.transport, color: "#10b981" },
      { name: "electricity", label: "Electricity", val: totals.electricity, color: "#06b6d4" },
      { name: "food", label: "Diet & Food", val: totals.food, color: "#f59e0b" },
      { name: "shopping", label: "Shopping", val: totals.shopping, color: "#ec4899" }
    ].map((item) => ({
      ...item,
      percentage: Math.round((item.val / grandTotal) * 100)
    }));
  };

  const sections = getBreakdown();

  // Trigonometry calculation to draw SVG donut stroke dashboard path
  let accumulatedAngle = -90; // Start at the vertical top
  const size = 180;
  const radius = 62;
  const strokeWidth = 14;
  const center = size / 2;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col items-center justify-center p-3" id="environmental-donut-section">
      <div className="relative w-[180px] h-[180px]">
        <svg width={size} height={size} className="transform -rotate-90 select-none overflow-visible">
          {sections.map((sect, i) => {
            if (sect.percentage === 0) return null;
            
            // Calculate SVG Donut stroke dasharray offsets
            const circumference = 2 * Math.PI * radius;
            const segmentSize = (sect.percentage / 100) * circumference;
            const offsetWidth = circumference - segmentSize;

            const dashArray = `${segmentSize} ${offsetWidth}`;
            const strokeOffset = -((accumulatedAngle + 90) / 360) * circumference;
            
            accumulatedAngle += (sect.percentage / 100) * 360;

            const isHovered = activeIndex === i;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={sect.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => {
                  setActiveIndex(i);
                  onSelectCategory(sect.name);
                }}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
          {/* Inner circle space */}
          <circle cx={center} cy={center} r={radius - 12} className="fill-slate-50/50 dark:fill-slate-900/60 backdrop-blur" />
        </svg>

        {/* Dynamic Center stats */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold font-display">
            {activeIndex !== null ? sections[activeIndex].label : "Carbon"}
          </span>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono transition-all duration-200">
            {activeIndex !== null ? `${sections[activeIndex].percentage}%` : `${Math.round(activities.reduce((a, b) => a + b.carbonAmount, 0))} kg`}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
            {activeIndex !== null ? `${sections[activeIndex].val.toFixed(0)} kg CO2e` : "This Month"}
          </span>
        </div>
      </div>

      {/* Grid Legend Row labels */}
      <div className="grid grid-cols-2 gap-2 mt-4 w-full text-xs">
        {sections.map((sect, i) => (
          <button
            key={i}
            onClick={() => onSelectCategory(sect.name)}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all duration-200 outline-none focus:ring-1 focus:ring-emerald-500 ${
              activeIndex === i
                ? "bg-slate-100 border-slate-300/60 dark:bg-slate-800/80 dark:border-slate-700"
                : "border-transparent text-slate-600 dark:text-slate-300"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sect.color }} />
            <div className="overflow-hidden whitespace-nowrap text-ellipsis">
              <span className="font-medium text-slate-800 dark:text-neutral-200">{sect.label}</span>
              <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500">{sect.percentage}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
