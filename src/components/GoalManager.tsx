import React, { useState, useEffect } from "react";
import {
  Target,
  Plus,
  Trash2,
  Archive,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  X,
  TrendingUp,
  Award,
  ListCheck,
  Footprints,
  Zap,
  Leaf,
  ShoppingBag,
  RotateCcw
} from "lucide-react";
import { Goal, Activity } from "../types";

interface GoalManagerProps {
  goals: Goal[];
  activities: Activity[];
  onSaveGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onAddNotification: (text: string) => void;
  isDark: boolean;
}

// Sleek responsive circular indicator component
const CircularProgress: React.FC<{
  percentage: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, color = "#10b981", size = 110, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-black font-mono tracking-tight text-slate-800 dark:text-white leading-none">
          {clampedPercentage.toFixed(0)}%
        </span>
        <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
          Achieved
        </span>
      </div>
    </div>
  );
};

export const GoalManager: React.FC<GoalManagerProps> = ({
  goals,
  activities,
  onSaveGoal,
  onDeleteGoal,
  onAddNotification,
  isDark
}) => {
  // Local state for goals, tabs, and form modals
  const [activeTab, setActiveTab] = useState<"active" | "archived" | "completed">("active");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form inputs state
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState<"transport" | "electricity" | "food" | "shopping" | "general">("general");
  const [goalType, setGoalType] = useState<"ceiling" | "action">("ceiling");
  const [targetValue, setTargetValue] = useState<number>(100);
  const [deadlineDate, setDeadlineDate] = useState("");

  // AI suggestions states
  const [selectedGoalForAI, setSelectedGoalForAI] = useState<Goal | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestion: string;
    actionSteps: string[];
  } | null>(null);

  // Auto-calculated fields for each goal based on actual user activities
  const getGoalStatus = (goal: Goal) => {
    const matchingActs = activities.filter((a) => a.category === goal.category);
    
    // Default system goals matching patterns
    if (goal.category === "food") {
      // vegan meals tracked
      const veganCount = activities.filter(
        (a) => a.category === "food" && (a.label.toLowerCase().includes("vegan") || a.label.toLowerCase().includes("vegetarian"))
      ).length;
      
      const progress = Math.min(100, (veganCount / goal.targetKg) * 100);
      return {
        current: veganCount,
        percentage: progress,
        unit: "meals tracked",
        isFallingBehind: progress < 40 && new Date(goal.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000,
        color: progress >= 100 ? "#10b981" : progress > 50 ? "#06b6d4" : "#f59e0b"
      };
    } else {
      // emission caps / budget ceiling
      const emittedKg = matchingActs.reduce((sum, a) => sum + a.carbonAmount, 0);
      
      // if emitted is 0, progress is 100% (or ceiling budget remaining)
      // progress of staying under the ceiling:
      // if total emitted is up to target limit: progress percentage shows remaining budget
      const spentPercent = (emittedKg / goal.targetKg) * 100;
      const progress = Math.max(0, 100 - spentPercent);
      
      // falling behind is when budget is exceeded orspent > 90%
      const isFallingBehind = spentPercent > 85;
      
      return {
        current: Number(emittedKg.toFixed(1)),
        percentage: progress,
        unit: "kg CO2e emitted",
        isFallingBehind,
        color: progress === 0 ? "#ef4444" : progress < 30 ? "#f59e0b" : progress > 70 ? "#10b981" : "#06b6d4"
      };
    }
  };

  // Set default values when opening form for creating / editing
  const handleOpenForm = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalTitle(goal.title);
      setGoalCategory(goal.category);
      setGoalType(goal.category === "food" ? "action" : "ceiling");
      setTargetValue(goal.targetKg);
      setDeadlineDate(goal.deadline);
    } else {
      setEditingGoal(null);
      setGoalTitle("");
      setGoalCategory("general");
      setGoalType("ceiling");
      setTargetValue(50);
      
      // Set default deadline 2 weeks from now
      const twoWeeksNow = new Date();
      twoWeeksNow.setDate(twoWeeksNow.getDate() + 14);
      setDeadlineDate(twoWeeksNow.toISOString().split("T")[0]);
    }
    setIsFormOpen(true);
  };

  // Save Goal to state & backend (Firestore)
  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const goalId = editingGoal ? editingGoal.id : `goal-${Date.now()}`;
    const trackingInfo = editingGoal ? getGoalStatus(editingGoal) : { percentage: 0 };
    
    const configuredGoal: Goal = {
      id: goalId,
      title: goalTitle,
      category: goalCategory,
      targetKg: Number(targetValue) || 50,
      currentKg: editingGoal ? editingGoal.currentKg : 0,
      deadline: deadlineDate || new Date().toISOString().split("T")[0],
      isCompleted: editingGoal ? (trackingInfo.percentage >= 100 || trackingInfo.percentage === 0 && goalCategory !== "food") : false,
      isArchived: editingGoal ? editingGoal.isArchived : false
    };

    try {
      await onSaveGoal(configuredGoal);
      onAddNotification(
        editingGoal 
          ? `Goal "${goalTitle}" updated successfully!` 
          : `Sustainable Goal "${goalTitle}" initiated!`
      );
      setIsFormOpen(false);
      setEditingGoal(null);
    } catch (err) {
      console.error("Error saving goal:", err);
    }
  };

  // Toggle goal archive state
  const handleArchiveGoal = async (goal: Goal) => {
    const updated: Goal = {
      ...goal,
      isArchived: !goal.isArchived
    };
    try {
      await onSaveGoal(updated);
      onAddNotification(
        updated.isArchived 
          ? `Archived goal: "${goal.title}"` 
          : `Restored goal: "${goal.title}"`
      );
    } catch (err) {
      console.error("Archive error:", err);
    }
  };

  // Fetch or trigger high quality AI suggestions using Express endpoint
  const handleGetAISuggestions = async (goal: Goal) => {
    setSelectedGoalForAI(goal);
    setAiLoading(true);
    setAiSuggestion(null);

    const tracking = getGoalStatus(goal);
    const relevantActivities = activities.filter((a) => a.category === goal.category);

    try {
      const res = await fetch("/api/goals-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          goal,
          currentProgress: tracking.percentage,
          relevantActivities: relevantActivities.slice(0, 5) // Send top 5 matching logs
        })
      });
      const data = await res.json();
      setAiSuggestion(data);
    } catch (err) {
      console.error("Failed fetching AI advisory details:", err);
      setAiSuggestion({
        suggestion: "Analyze appliances and transportation leaks to hit offset targets.",
        actionSteps: ["Carpool or cycle", "Manage room thermal limits", "Audit stand-by energy loads"]
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Filter goals matching selected list state
  const displayedGoals = goals.filter((g) => {
    const completed = g.isCompleted || getGoalStatus(g).percentage >= 100;
    
    if (activeTab === "archived") return g.isArchived;
    if (g.isArchived) return false;
    
    if (activeTab === "completed") return completed;
    return !completed; // Active tab
  });

  return (
    <div className="space-y-6">
      {/* HEADER HERO AREA */}
      <div className={`p-6 md:p-8 rounded-3xl border text-left relative overflow-hidden transition-all duration-350 shadow-xl ${
        isDark 
          ? "bg-slate-900/40 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950" 
          : "bg-emerald-50/5 border-slate-200"
      }`}>
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black font-display text-slate-850 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Target className="w-5.5 h-5.5 text-emerald-400 animate-pulse" />
              Sovereign Goal Registry
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed max-w-2xl">
              Establish targeted carbon ceiling limits or vegan dietary goals. Sync benchmarks seamlessly, 
              receive intelligent alerts, and trace completion rates to protect your local environment.
            </p>
          </div>

          <button
            onClick={() => handleOpenForm()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 dark:text-white font-mono text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 self-start sm:self-center uppercase transition-all shadow-md active:scale-95 border-none outline-none"
          >
            <Plus className="w-4 h-4" />
            Set Target
          </button>
        </div>

        {/* PROGRESS METRIC OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-200/10 dark:border-slate-800/60">
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-slate-450 dark:text-slate-500 block font-bold">Total Active Targets</span>
            <span className="text-2xl font-black font-mono text-slate-800 dark:text-white">
              {goals.filter(g => !g.isArchived && !g.isCompleted).length}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-slate-450 dark:text-slate-500 block font-bold">Goals Completed</span>
            <span className="text-2xl font-black font-mono text-emerald-500">
              {goals.filter(g => g.isCompleted || getGoalStatus(g).percentage >= 100).length}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-slate-450 dark:text-slate-500 block font-bold">Archived Record Limit</span>
            <span className="text-2xl font-black font-mono text-slate-405 dark:text-slate-400">
              {goals.filter(g => g.isArchived).length}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-slate-450 dark:text-slate-500 block font-bold">System Status</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block leading-none">
              Persistent & Locked
            </span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex border-b border-slate-200/10 dark:border-slate-800/60 pb-1.5 gap-4">
        {[
          { id: "active", label: "Active Goals", count: goals.filter(g => !g.isArchived && !g.isCompleted && getGoalStatus(g).percentage < 100).length },
          { id: "completed", label: "Achieved", count: goals.filter(g => !g.isArchived && (g.isCompleted || getGoalStatus(g).percentage >= 100)).length },
          { id: "archived", label: "Archived Ledger", count: goals.filter(g => g.isArchived).length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer outline-none ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-505 dark:text-emerald-400"
                : "text-slate-450 hover:text-slate-300 border-transparent"
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-slate-200/40 dark:bg-slate-800 text-slate-450 dark:text-slate-400 rounded-full font-mono font-black">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* GOALS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Main List view (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          {displayedGoals.length === 0 ? (
            <div className={`p-10 rounded-3xl border text-center space-y-3 ${
              isDark ? "bg-slate-900/20 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <Target className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
              <h3 className="text-xs font-black font-display uppercase text-slate-505 tracking-wider">No Goals Stored inside partition</h3>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Clean and persistent database registers. Push set target top button to formulate your customized climate abatement goal today.
              </p>
            </div>
          ) : (
            displayedGoals.map((goal) => {
              const status = getGoalStatus(goal);
              
              return (
                <div
                  key={goal.id}
                  className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col md:flex-row gap-5 items-center justify-between text-left ${
                    isDark 
                      ? "bg-slate-900/40 border-slate-850 hover:border-slate-800" 
                      : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  {/* Category icon decorative overlay */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-xl pointer-events-none" />

                  {/* Left segment info & stats */}
                  <div className="flex items-start gap-4 self-stretch md:self-auto">
                    {/* Animated Circular Indicator */}
                    <CircularProgress 
                      percentage={status.percentage} 
                      color={status.color} 
                      size={95} 
                      strokeWidth={7} 
                    />

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-md" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                          {goal.category}
                        </span>
                        {status.isFallingBehind && (
                          <span className="text-[8.5px] uppercase font-mono font-black border border-rose-500/20 bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Behind
                          </span>
                        )}
                        {status.percentage >= 100 && (
                          <span className="text-[8.5px] uppercase font-mono font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Award className="w-3 h-3 text-emerald-400" /> Completed
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-bold text-sm text-slate-850 dark:text-white leading-snug truncate">
                        {goal.title}
                      </h3>

                      {/* Display deadlines and specific calculations */}
                      <div className="flex flex-col space-y-1 text-[10px] text-slate-450 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Target limit deadline: {goal.deadline}
                        </span>
                        <span>
                          Current status: <b className="text-slate-800 dark:text-slate-205">{status.current}</b> {status.unit}
                        </span>
                        <span>
                          Limit ceiling scale: <b>{goal.targetKg}</b> kg limit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operations button row */}
                  <div className="flex md:flex-col items-center justify-end gap-2.5 self-end md:self-center shrink-0">
                    {/* AI Plan button */}
                    {status.isFallingBehind && (
                      <button
                        onClick={() => handleGetAISuggestions(goal)}
                        className="p-2 border border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 rounded-xl transition-all cursor-pointer text-[10px] font-black flex items-center gap-1 uppercase tracking-wide"
                        title="Generate Custom Plan"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Rescue Plan
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenForm(goal)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                          isDark ? "bg-slate-950/40 hover:bg-slate-800 border-slate-800 text-slate-400" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveGoal(goal)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                          goal.isArchived 
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                            : isDark ? "bg-slate-950/40 hover:bg-slate-800 border-slate-800 text-slate-400" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                        title={goal.isArchived ? "Restore Goal" : "Archive Goal"}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                          isDark ? "bg-slate-950/40 hover:bg-rose-950/30 border-slate-800 text-slate-400 hover:text-rose-450 hover:border-rose-900/30" : "bg-slate-50 hover:bg-rose-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200"
                        }`}
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* AI Action/Suggestions Sidebar (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-3xl border text-left space-y-4 ${
            isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <h3 className="text-xs font-black font-display text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b pb-3 border-slate-200/50 dark:border-slate-800/60 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Dynamic Advisor Desk
            </h3>

            {selectedGoalForAI ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <span className="text-[8.5px] uppercase font-mono font-extrabold text-emerald-400 leading-none">TARGET SELECTED</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 italic">
                    "{selectedGoalForAI.title}"
                  </h4>
                </div>

                {aiLoading ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-slate-450 font-mono italic animate-pulse">
                      Generating tailored abatement plan from Gemini...
                    </p>
                  </div>
                ) : aiSuggestion ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                      isDark ? "bg-slate-950/60 border-slate-850 text-slate-300" : "bg-slate-50/70 border-slate-200 text-slate-700"
                    }`}>
                      {aiSuggestion.suggestion}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[8.5px] uppercase font-mono font-black text-slate-400">RECOMMENDED STEPS</span>
                      <div className="space-y-2">
                        {aiSuggestion.actionSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-[10.5px] font-semibold leading-relaxed flex gap-2.5 items-start ${
                              isDark ? "bg-emerald-950/5 border-emerald-900/20 text-slate-300" : "bg-emerald-50/10 border-emerald-100 text-slate-700"
                            }`}
                          >
                            <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[9px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Target className="w-8 h-8 mx-auto text-slate-500 opacity-40 animate-pulse" />
                <p className="text-[10px] italic font-medium max-w-xs mx-auto leading-normal">
                  No target flagged for advisory mitigation yet. Trigger "AI Rescue Plan" button on any active target to compute steps on this pane.
                </p>
              </div>
            )}
          </div>

          {/* ADVANCED RECOMMENDATIONS CARD */}
          <div className={`p-5 rounded-3xl border text-left space-y-3 bg-gradient-to-br ${
            isDark 
              ? "from-slate-950 via-slate-900/40 to-slate-950 border-indigo-500/15" 
              : "from-white to-slate-50 border-slate-200 shadow-sm"
          }`}>
            <h4 className="text-[11px] font-mono leading-none uppercase font-black tracking-wider text-indigo-500 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
              Environmental Milestones
            </h4>
            <p className="text-[10.5px] leading-relaxed text-slate-400">
              When targets are completely fulfilled, special badges are unlocked immediately to elevate your Eco-Score rank. Complete multiple target ranges to claim legendary titles.
            </p>
          </div>
        </div>

      </div>

      {/* DETAILED DIALOG MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl border p-6 text-left relative animate-in zoom-in-95 duration-200 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full cursor-pointer border-none outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black font-display uppercase tracking-wider mb-5 flex items-center gap-1.5">
              <Target className="w-4.5 h-4.5 text-emerald-400" />
              {editingGoal ? "Edit Target configuration" : "Set New Sustainable Target"}
            </h3>

            <form onSubmit={handleSubmitGoal} className="space-y-4">
              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Goal Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keep Transport Emissions Low"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className={`w-full px-4.5 py-3 rounded-xl text-xs font-semibold bg-transparent border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isDark ? "border-slate-800 focus:border-slate-700 text-white" : "border-slate-200 focus:border-slate-450 text-slate-800"
                  }`}
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Target Category</label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value as any)}
                  className={`w-full px-4.5 py-3 rounded-xl text-xs font-semibold bg-transparent border focus:outline-none ${
                    isDark ? "border-slate-800 text-white bg-slate-950 focus:border-slate-700" : "border-slate-200 text-slate-850 bg-white"
                  }`}
                >
                  <option value="general">General Carbon Baseline</option>
                  <option value="transport">Transport Transits</option>
                  <option value="electricity">Electricity grid</option>
                  <option value="food">Dietary & Food logs</option>
                  <option value="shopping">Shopping & Acquisitions</option>
                </select>
              </div>

              {/* Target ceiling metrics values input */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-slate-400">
                    {goalCategory === "food" ? "Target Count (Meals)" : "Threshold Carbon (kg)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                    className={`w-full px-4.5 py-3 rounded-xl text-xs font-mono font-bold bg-transparent border focus:outline-none ${
                      isDark ? "border-slate-800 focus:border-slate-700 text-white" : "border-slate-200 focus:border-slate-450 text-slate-800"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono font-bold text-slate-400">Boundary Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className={`w-full px-4.5 py-3 rounded-xl text-xs font-mono bg-transparent border focus:outline-none ${
                      isDark ? "border-slate-800 focus:border-slate-700 text-white" : "border-slate-200 focus:border-slate-450 text-slate-800"
                    }`}
                  />
                </div>
              </div>

              {/* Information tips based on select */}
              <p className="text-[10px] text-slate-400 italic">
                {goalCategory === "food" 
                  ? "We will auto-evaluate your vegan meal logged events relative to this dynamic count."
                  : `Your matching emissions logged in "${goalCategory}" category will automatically update this ceiling indicator.`}
              </p>

              {/* Submit panel */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`w-1/2 py-3.5 text-xs font-bold tracking-wider uppercase rounded-xl border cursor-pointer outline-none ${
                    isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3.5 text-xs font-black tracking-wider uppercase bg-[#0c3e2e] dark:bg-emerald-600 text-white rounded-xl cursor-pointer border-none outline-none shadow-md"
                >
                  Confirm Configuration
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
