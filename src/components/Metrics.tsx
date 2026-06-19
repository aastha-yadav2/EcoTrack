import React from "react";
import { Leaf, Award, Footprints, Sparkles, AlertTriangle } from "lucide-react";

interface MetricsProps {
  totalEmissions: number;
  carbonSaved: number;
  score: number;
  goalProgress: number;
  isDark: boolean;
}

export const Metrics: React.FC<MetricsProps> = ({
  totalEmissions,
  carbonSaved,
  score,
  goalProgress,
  isDark,
}) => {
  // Score ratings and descriptions
  const getRating = (pts: number) => {
    if (pts >= 85) return { label: "Elite Conservator", color: "text-emerald-500", rawColor: "#10b981" };
    if (pts >= 70) return { label: "Eco Warrior", color: "text-teal-400", rawColor: "#2da8a8" };
    if (pts >= 50) return { label: "Mindful Citizen", color: "text-amber-500", rawColor: "#f59e0b" };
    return { label: "Carbon Heavy", color: "text-rose-500", rawColor: "#f43f5e" };
  };

  const ratingObj = getRating(score);

  // Custom circular ring stroke coordinates for sustainability rating rings
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const statCards = [
    {
      id: "stat-emissions",
      title: "Monthly Carbon Footprint",
      value: `${Math.round(totalEmissions)} kg`,
      unit: "CO2e offset",
      desc: "Household carbon index",
      colorClass: "text-emerald-500",
      bgGlow: "rgba(16, 185, 129, 0.08)",
      icon: Footprints,
      node: null
    },
    {
      id: "stat-saved",
      title: "Carbon Offset Saved",
      value: `${Math.round(carbonSaved)} kg`,
      unit: "CO2e saved",
      desc: "Compared to average citizens",
      colorClass: "text-sky-500",
      bgGlow: "rgba(14, 165, 233, 0.08)",
      icon: Leaf,
      node: null
    },
    {
      id: "stat-score",
      title: "Sustainability Score",
      value: `${score}/100`,
      unit: ratingObj.label,
      desc: "Real-time consumption rating",
      colorClass: ratingObj.color,
      bgGlow: "rgba(245, 158, 11, 0.08)",
      icon: Award,
      // Render beautiful radial circle gauge inside statistic block
      node: (
        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={r}
              className="stroke-slate-200 dark:stroke-slate-800 fill-none"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r={r}
              stroke={ratingObj.rawColor}
              strokeWidth="4"
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="fill-none transition-all duration-500"
            />
          </svg>
          <span className="absolute text-[11px] font-bold font-mono text-slate-800 dark:text-neutral-100">
            {score}
          </span>
        </div>
      )
    },
    {
      id: "stat-goals",
      title: "Goals Progress Ratio",
      value: `${Math.round(goalProgress)}%`,
      unit: "Goals logged",
      desc: "Active milestones hit",
      colorClass: "text-pink-500",
      bgGlow: "rgba(236, 72, 153, 0.08)",
      icon: Sparkles,
      // Render premium horizontal progress metrics
      node: (
        <div className="w-14 flex flex-col gap-1.5 justify-center shrink-0">
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-right font-mono text-slate-400 dark:text-slate-500 font-semibold">
            {goalProgress}%
          </span>
        </div>
      )
    }
  ];

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      id="top-dashboard-statistics-grid"
    >
      {statCards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            role="status"
            aria-label={`${card.title}: ${card.value}`}
            className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between ${
              isDark
                ? "bg-slate-900/40 border-slate-800 hover:border-emerald-500/35 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)] text-slate-200"
                : "bg-white/60 border-slate-200 hover:border-emerald-500/20 hover:shadow-lg text-slate-800"
            }`}
          >
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold font-display">
                {card.title}
              </span>
              <div className="flex items-end justify-between mt-2">
                <div className="flex items-baseline gap-1.5 overflow-hidden">
                  <span className={`text-2xl font-bold font-sans tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {card.value.split(" ")[0]}
                  </span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {card.value.split(" ")[1] || card.unit}
                  </span>
                </div>

                {/* Custom SVG Nodes (Ring/Bar gauges) or standard badge style icons */}
                {card.node ? (
                  card.node
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-transform hover:scale-105"
                    style={{ backgroundColor: card.bgGlow }}
                  >
                    <IconComponent className={`w-4.5 h-4.5 ${card.colorClass}`} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100/50 dark:border-slate-800/50 pt-2 mt-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                {card.desc}
              </span>
              {card.id === "stat-emissions" && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  ↓ 12%
                </span>
              )}
              {card.id === "stat-saved" && (
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  +84 kg
                </span>
              )}
              {card.id === "stat-score" && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Elite
                </span>
              )}
              {card.id === "stat-goals" && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  64% Hit
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
