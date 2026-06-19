/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Leaf,
  Award,
  Footprints,
  Sparkles,
  AlertTriangle,
  Moon,
  Sun,
  Bell,
  User,
  Plus,
  Trash2,
  Calendar,
  Flame,
  Bike,
  Zap,
  ShoppingBag,
  Eye,
  Minimize2,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Send
} from "lucide-react";

import { Activity, Goal, Badge, AIInsight, ChatMessage } from "./types";
import {
  INITIAL_ACTIVITIES,
  INITIAL_GOALS,
  INITIAL_BADGES,
  ECO_CHALLENGE,
  DYNAMIC_TIPS
} from "./data";

import { Metrics } from "./components/Metrics";
import { ActivityLogger } from "./components/ActivityLogger";
import { TrendLineChart, WeeklyBarChart, CategoryDonutChart } from "./components/SassCharts";
import { AIAssistant } from "./components/AIAssistant";
import { FooterAudit } from "./components/FooterAudit";

export default function App() {
  // Theme management: defaults to dark mode for carbon dashboard tech-look
  const [isDark, setIsDark] = useState<boolean>(() => {
    const cached = localStorage.getItem("ecotrack-theme");
    return cached ? cached === "dark" : true;
  });

  // Main global states
  const [activities, setActivities] = useState<Activity[]>(() => {
    const cached = localStorage.getItem("ecotrack-activities");
    try {
      return cached ? JSON.parse(cached) : INITIAL_ACTIVITIES;
    } catch {
      return INITIAL_ACTIVITIES;
    }
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const cached = localStorage.getItem("ecotrack-goals");
    try {
      return cached ? JSON.parse(cached) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  });

  const [badges, setBadges] = useState<Badge[]>(() => {
    const cached = localStorage.getItem("ecotrack-badges");
    try {
      return cached ? JSON.parse(cached) : INITIAL_BADGES;
    } catch {
      return INITIAL_BADGES;
    }
  });

  // AI-powered states fetched from backend
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [tipOfDay, setTipOfDay] = useState("");
  const [predictedEmissions, setPredictedEmissions] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  // UI state variables
  const [streak, setStreak] = useState(() => {
    const cached = localStorage.getItem("ecotrack-streak");
    return cached ? parseInt(cached) : 5;
  });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: "not-1", text: "Welcome to EcoTrack! Initialize carbon goals.", time: "10m ago", read: false },
    { id: "not-2", text: "Eco streak raised to 5 days! Streak multiplier active.", time: "2h ago", read: false }
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedDonutCategory, setSelectedDonutCategory] = useState<string>("transport");

  // Tab navigation states
  const [activeTab, setActiveTab] = useState<string>("home");

  // Full-page AI Advisor Chat States
  const [inLineMessages, setInLineMessages] = useState<ChatMessage[]>([
    {
      id: "in-wel-1",
      role: "model",
      content: `Welcome to the **AI Sustainability Advisor Desk**! 🌿\n\nI have analyzed your carbon parameters. You current rank with an Eco-score of **${Math.max(15, Math.min(100, Math.round(100 - (activities.reduce((sum, a) => sum + a.carbonAmount, 0) * 0.16))))}/100**.\n\nAsk me anything! Let me help you lower transport waste, optimize electrical home appliances, or draft meat-free meal preps today.`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inLineInput, setInLineInput] = useState("");
  const [inLineLoading, setInLineLoading] = useState(false);

  const handleSendInLineMessage = async (text: string) => {
    if (!text.trim() || inLineLoading) return;
    const userMsg: ChatMessage = {
      id: `in-usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    setInLineMessages((prev) => [...prev, userMsg]);
    setInLineInput("");
    setInLineLoading(true);

    try {
      const historyContext = inLineMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyContext,
          stats: {
            currentScore: Math.max(15, Math.min(100, Math.round(100 - (carbonTotal * 0.16)))),
            totalActivitiesLoggedCount: activities.length
          }
        })
      });

      if (!res.ok) throw new Error("Eco processors timed out.");
      const data = await res.json();

      const modelMsg: ChatMessage = {
        id: `in-mod-${Date.now()}`,
        role: "model",
        content: data.reply || "I am currently adjusting carbon weights. Ask me again shortly!",
        timestamp: new Date().toISOString()
      };
      setInLineMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `in-err-${Date.now()}`,
        role: "model",
        content: "⚠️ I had a temporary issue fetching data through the eco-grid. Please check your network connection or verify key configurations in Settings.",
        timestamp: new Date().toISOString()
      };
      setInLineMessages((prev) => [...prev, errMsg]);
    } finally {
      setInLineLoading(false);
    }
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("ecotrack-activities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem("ecotrack-goals", JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem("ecotrack-badges", JSON.stringify(badges));
  }, [badges]);

  useEffect(() => {
    localStorage.setItem("ecotrack-theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Fetch carbon insights from server-side Gemini Proxy routes on mount & activity updates
  const fetchAIInsights = async () => {
    setAiLoading(true);
    try {
      const breakdown = { transport: 0, electricity: 0, food: 0, shopping: 0 };
      activities.forEach((a) => {
        if (breakdown[a.category] !== undefined) breakdown[a.category] += a.carbonAmount;
      });

      const carbonTotal = activities.reduce((acc, curr) => acc + curr.carbonAmount, 0);
      const carbonSaved = Math.max(0, 480 - carbonTotal);
      const score = Math.max(10, Math.min(100, Math.round(100 - (carbonTotal * 0.18))));

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityStats: breakdown,
          currentScore: score,
          carbonSaved,
          carbonTotal
        })
      });

      if (!res.ok) throw new Error("Insights system delayed");
      const data = await res.json();
      
      setAiInsights(data.insights || []);
      setTipOfDay(data.tipOfDay || DYNAMIC_TIPS[0]);
      setPredictedEmissions(data.predictedEmissions || Math.round(carbonTotal * 0.9));
    } catch (err) {
      console.error(err);
      // Sensible resilient defaults if fetch fails (e.g. without API key configure)
      const fallbackTotal = activities.reduce((sum, a) => sum + a.carbonAmount, 0);
      setAiInsights([
        {
          id: "flb-1",
          type: "warning",
          title: "Commute Outflow Critical",
          content: "Vehicle trips average over 40% of baseline. Seek bus links or join car pools this week.",
          impact: "-14 kg CO2e"
        },
        {
          id: "flb-2",
          type: "success",
          title: "Optimum Grid Consumption",
          content: "Standby electricity offsets logged are outstanding. Maintain cooling ranges within 19-21°C.",
          impact: "-20 kg CO2e"
        }
      ]);
      setTipOfDay(DYNAMIC_TIPS[Math.floor(Math.random() * DYNAMIC_TIPS.length)]);
      setPredictedEmissions(Math.round(fallbackTotal * 0.92));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, [activities.length]); // Recalculate on listing length modifications

  // Calculation parameters
  const carbonTotal = activities.reduce((acc, curr) => acc + curr.carbonAmount, 0);
  const carbonSaved = Math.max(0, 390 - carbonTotal); // Standard reference of 390 kg target
  const score = Math.max(15, Math.min(100, Math.round(100 - (carbonTotal * 0.16))));
  
  // Calculate specific goal metrics based on logged activities
  const activeGoalProgress = (() => {
    if (goals.length === 0) return 0;
    // Map current category emission sums to check goal status
    const sums = { transport: 0, electricity: 0, food: 0, shopping: 0 };
    activities.forEach((act) => {
      if (sums[act.category] !== undefined) sums[act.category] += act.carbonAmount;
    });

    // Compute progress of goals
    let totalProgress = 0;
    goals.forEach((g) => {
      if (g.category === "food") {
        // Diet count progress
        const count = activities.filter((a) => a.category === "food" && a.label.includes("Vegan")).length;
        const progress = Math.min(100, Math.round((count / g.targetKg) * 100));
        totalProgress += progress;
      } else if (g.category in sums) {
        // Limit progress (lower means better!)
        const spent = sums[g.category as keyof typeof sums];
        const progress = spent <= g.targetKg ? 100 : Math.max(0, Math.round((1 - (spent - g.targetKg) / g.targetKg) * 100));
        totalProgress += progress;
      } else {
        totalProgress += 80; // General targets default fallback
      }
    });

    return totalProgress / goals.length;
  })();

  const getTier = (s: number) => {
    if (s >= 85) return { name: "Platinum Guard", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", next: "Max level attained" };
    if (s >= 70) return { name: "Gold Conservator", color: "bg-teal-500/15 text-teal-400 border-teal-500/30", next: "Platinum Guard in +15 pts" };
    if (s >= 50) return { name: "Silver Sustainer", color: "bg-amber-500/15 text-amber-500 border-amber-500/30", next: "Gold Conservator in +20 pts" };
    return { name: "Bronze Novice", color: "bg-rose-500/15 text-rose-500 border-rose-500/30", next: "Silver Sustainer in +35 pts" };
  };

  const tier = getTier(score);

  // Handlers
  const handleAddActivity = (newAct: Omit<Activity, "id" | "timestamp">) => {
    const activity: Activity = {
      ...newAct,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setActivities((prev) => [activity, ...prev]);

    // Push interactive notification feedback
    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        text: `Logged carbon event: ${newAct.label.split("via")[0]}`,
        time: "Just now",
        read: false
      },
      ...prev
    ]);

    // Check goal completeness triggers instantly!
    const sums = { transport: 0, electricity: 0, food: 0, shopping: 0 };
    [activity, ...activities].forEach((a) => {
      if (sums[a.category] !== undefined) sums[a.category] += a.carbonAmount;
    });

    // Check food counts
    const veganMeals = [activity, ...activities].filter((a) => a.category === "food" && a.label.includes("Vegan")).length;

    let unlockedABadge = false;
    const updatedGoals = goals.map((g) => {
      let isComp = false;
      if (g.category === "food") {
        isComp = veganMeals >= g.targetKg;
      } else if (g.category in sums) {
        isComp = sums[g.category as keyof typeof sums] <= g.targetKg;
      }

      if (isComp && !g.isCompleted) {
        unlockedABadge = true;
      }
      return { ...g, isCompleted: isComp };
    });

    setGoals(updatedGoals);

    if (unlockedABadge) {
      // Trigger badge unlock for "Power Miser" or other locks
      const updatedBadges = badges.map((b) => {
        if (b.unlockedAt === null) {
          return { ...b, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      setBadges(updatedBadges);
      setNotifications((prev) => [
        { id: `not-bdg-${Date.now()}`, text: "🏆 Exclusive badge unlocked! Check your honors drawer below.", time: "Just now", read: false },
        ...prev
      ]);
    }
  };

  const handleDeleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setNotifications((prev) => [
      { id: `not-del-${Date.now()}`, text: "Activity log removed. Offsets re-balanced.", time: "Just now", read: false },
      ...prev
    ]);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setNotificationOpen(false);
  };

  const handleBoostStreak = () => {
    setStreak((prev) => {
      const next = prev + 1;
      localStorage.setItem("ecotrack-streak", next.toString());
      return next;
    });
    setNotifications((prev) => [
      { id: `not-str-${Date.now()}`, text: "🔥 Streak reinforced! Daily metrics saved.", time: "Just now", read: false },
      ...prev
    ]);
  };

  return (
    <div
      className={`min-h-screen py-6 px-4 md:px-8 transition-colors duration-300 font-sans ${
        isDark ? "bg-[#090d16] text-slate-200" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER BAR */}
        <header
          className={`rounded-2xl px-6 py-3.5 border flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 transition-all duration-300 ${
            isDark ? "bg-slate-900/50 border-slate-800 shadow-2xl" : "bg-white/70 border-slate-200 shadow-lg"
          } backdrop-blur-xl`}
          id="ecotrack-header"
        >
          {/* Brand Identification */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
              <Leaf className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white select-none">
                  Eco<span className="text-emerald-500 dark:text-emerald-400">Track</span>
                </h1>
                <span className="ml-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Level 14 · Sage
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                AI-Powered Sustainability Engine
              </p>
            </div>
          </div>

          {/* Center Sustainability Badge indicator */}
          <div className="flex items-center gap-2 font-display">
            <span className="text-[11px] font-medium text-slate-400">Class Rank:</span>
            <div className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${tier.color}`}>
              <Award className="w-3.5 h-3.5" />
              <span>{tier.name}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline shrink-0">
              ({tier.next})
            </span>
          </div>

          {/* Action Row options */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* AI Assistant drawer toggle */}
            <button
              onClick={() => setAssistantOpen(true)}
              aria-label="Open AI chatbot assistance"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] outline-none cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-emerald-400" />
              <span>AI Assistant</span>
            </button>

            {/* Notification dropdown toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-label="Toggle notifications list"
                className={`p-2 rounded-xl border transition-colors outline-none cursor-pointer ${
                  isDark ? "hover:bg-slate-800 border-slate-800" : "hover:bg-slate-200 border-slate-200"
                }`}
              >
                <div className="relative">
                  <Bell className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                  )}
                </div>
              </button>

              {notificationOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 z-40 p-4 rounded-xl border shadow-xl ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 text-slate-800"
                  }`}
                  id="notifications-dropdown"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Notifications
                    </h4>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearNotifications}
                        className="text-[10px] text-emerald-500 dark:text-emerald-400 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4 italic">
                        No new carbon reports logged.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="text-xs pb-2 border-b border-slate-800/25 last:border-b-0 space-y-0.5">
                          <p className="font-sans text-slate-300 dark:text-slate-100">{n.text}</p>
                          <span className="block text-[9px] text-slate-400 font-mono">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark & Light toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label="Toggle theme display configuration"
              className={`p-2 rounded-xl border transition-colors outline-none cursor-pointer ${
                isDark ? "hover:bg-slate-800 border-slate-800" : "hover:bg-slate-200 border-slate-200"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Profile thumbnail */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200/20 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <div className="hidden lg:block text-left">
                <span className="block text-[10px] font-semibold text-slate-400">YADAV AASTHA</span>
                <span className="block text-[9px] font-mono text-slate-500 leading-none">Senior Architect</span>
              </div>
            </div>

          </div>
        </header>

        {/* TAB NAVIGATION BAR */}
        <nav
          className={`rounded-2xl p-1.5 border flex items-center justify-start overflow-x-auto gap-1 md:gap-2 no-scrollbar transition-all duration-300 ${
            isDark ? "bg-slate-900/50 border-slate-800 shadow-xl" : "bg-white/60 border-slate-200 shadow"
          } backdrop-blur-xl shrink-0`}
          id="ecotrack-nav"
        >
          {[
            { id: "home", label: "Home Page", icon: Leaf },
            { id: "analytics", label: "Carbon Charts", icon: Footprints },
            { id: "logger", label: "Activity Logger", icon: Plus },
            { id: "milestones", label: "Goals & Badges", icon: Award },
            { id: "copilot", label: "AI Advisor Chat", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-xs md:text-sm font-semibold rounded-xl cursor-pointer transition-all shrink-0 outline-none ${
                  isActive
                    ? isDark
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-emerald-50 text-emerald-750 border border-emerald-200 shadow-sm"
                    : isDark
                      ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-500 animate-pulse" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

         {/* CONDITIONALLY RENDERED SEGMENTS BASED ON ACTIVE TAB */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* HERO WELCOME HEADER */}
            <div
              className={`rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-slate-900/40 border-slate-800 shadow-2xl bg-gradient-to-br from-slate-900/40 via-[#0a1224]/50 to-slate-900/35" 
                  : "bg-white/75 border-slate-200 shadow-lg bg-gradient-to-br from-white/75 via-emerald-50/10 to-slate-50/40"
              }`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/10 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Live Environment Counter
                  </div>
                  <h2 className="font-display font-bold text-2xl tracking-tight text-slate-800 dark:text-slate-50">
                    Welcome Back, Yadav Aastha! 🌿
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Great progress this week! Your sustainable habits have helped mitigate standard baseline offsets. Focus on lowering commute parameters to raise your rating to <b>Platinum Guard</b>.
                  </p>
                </div>
                
                {/* Micro telemetry counters */}
                <div className="flex gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800/10 text-left shrink-0">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-none font-bold">COMMITTED STREAK</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
                      <span className="text-xl font-bold font-mono text-slate-800 dark:text-white">{streak} Days</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800/10 text-left shrink-0">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-none font-bold">CURRENT RANK TIER</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Award className="w-5 h-5 text-teal-400" />
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{tier.name.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PERSISTENT TOP STATISTIC METRICS */}
            <Metrics
              totalEmissions={carbonTotal}
              carbonSaved={carbonSaved}
              score={score}
              goalProgress={activeGoalProgress}
              isDark={isDark}
            />

            {/* GRID LAYOUTS FOR QUICK SUMMARIES */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: AI Alerts & Insights (Span 4) */}
              <section className="lg:col-span-4 space-y-6">
                <div
                  className={`rounded-3xl p-5 border h-full transition-all duration-300 flex flex-col justify-between gap-4 ${
                    isDark ? "bg-indigo-600/10 border-indigo-500/20 text-slate-200" : "bg-indigo-50/45 border-indigo-100 text-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">
                          AI Insights
                        </h3>
                      </div>
                      <button
                        onClick={fetchAIInsights}
                        aria-label="Recalculate carbon analytics recommendation"
                        disabled={aiLoading}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-indigo-500 hover:text-indigo-400 disabled:opacity-40"
                      >
                        <RefreshCw className={`w-4 h-4 ${aiLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    {aiLoading ? (
                      <div className="space-y-3 py-6">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="space-y-2 animate-pulse">
                            <div className="h-4 bg-indigo-500/10 rounded-md w-2/3" />
                            <div className="h-3 bg-indigo-500/10 rounded-md" />
                            <div className="h-3 bg-indigo-500/10 rounded-md w-5/6" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiInsights.map((ins) => (
                          <div
                            key={ins.id}
                            className={`p-3 rounded-xl border text-left text-xs transition-all ${
                              isDark
                                ? "bg-slate-900/60 border-slate-850/50 text-slate-300"
                                : "bg-white/80 border-indigo-100 text-slate-700"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-neutral-100">
                                {ins.type === "warning" ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                                {ins.title}
                              </span>
                              <span className={`text-[10px] shrink-0 font-mono font-bold ${
                                ins.type === "warning" ? "text-rose-400" : "text-emerald-400"
                              }`}>
                                {ins.impact}
                              </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                              {ins.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Today's Tip */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-left mt-4">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">
                      Eco-tip of the day
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-normal">
                      {tipOfDay || DYNAMIC_TIPS[0]}
                    </p>
                  </div>

                  {/* Emissions projection predictions */}
                  <div className="border-t border-slate-200/20 dark:border-slate-800/60 pt-3 text-left mt-4">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Predicted Monthly</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {(predictedEmissions / 1000 || (carbonTotal * 0.9) / 1000).toFixed(2)} <span className="text-xs font-normal text-slate-400 uppercase tracking-wider">tCO2e</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* RIGHT COLUMN: Streak, Commute Challenges & Recent Activities (Span 8) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Streak Card */}
                  <div
                    className={`rounded-3xl p-5 border transition-all duration-300 ${
                      isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                    } backdrop-blur-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center font-bold relative">
                          <Flame className="w-5 h-5 animate-bounce" />
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-[10px] text-white flex items-center justify-center font-bold">
                            {streak}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-xs tracking-wide text-slate-400 uppercase">
                            Eco Streak
                          </h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{streak} straight days committed</p>
                        </div>
                      </div>
                      <button
                        onClick={handleBoostStreak}
                        className="py-1.5 px-3 rounded-lg border border-orange-500/30 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/10 cursor-pointer transition-colors"
                      >
                        Boost +1 Day
                      </button>
                    </div>
                  </div>

                  {/* Community Challenge */}
                  <div
                    className={`rounded-3xl p-5 border transition-all duration-300 ${
                      isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                    } backdrop-blur-md space-y-3`}
                  >
                    <div className="text-left">
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 font-display">
                        Active Clean Commute Rally
                      </span>
                      <h4 className="text-xs font-semibold mt-0.5">{ECO_CHALLENGE.title}</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${(ECO_CHALLENGE.currentSaved / ECO_CHALLENGE.targetTotalSaved) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{ECO_CHALLENGE.currentSaved} kg saved</span>
                        <span>{ECO_CHALLENGE.targetTotalSaved} kg target</span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-[10px] pt-1 text-left">
                      <div>
                        <span className="block font-bold font-mono text-slate-700 dark:text-slate-200">{ECO_CHALLENGE.daysRemaining} Days</span>
                        <span className="text-slate-400 font-sans">Time Left</span>
                      </div>
                      <div>
                        <span className="block font-bold font-mono text-slate-700 dark:text-slate-200">{ECO_CHALLENGE.participants}</span>
                        <span className="text-slate-400 font-sans">Participants</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities Feed on Home Tab */}
                <div
                  className={`rounded-3xl p-5 border transition-all duration-300 ${
                    isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                  } backdrop-blur-md`}
                >
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 text-left">
                    Recent Verified Activities
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 text-left">
                    Click "Activity Logger" above to record fresh data
                  </p>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {activities.length === 0 ? (
                      <p className="text-xs text-center py-8 text-slate-400 italic">
                        No habits logged yet.
                      </p>
                    ) : (
                      activities.slice(0, 5).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/10 bg-slate-950/20 hover:bg-slate-950/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                              a.category === "transport" ? "bg-emerald-500/10 text-emerald-400" :
                              a.category === "electricity" ? "bg-cyan-500/10 text-cyan-400" :
                              a.category === "food" ? "bg-amber-500/10 text-amber-400" : "bg-pink-500/10 text-pink-400"
                            }`}>
                              {a.category === "transport" && <Bike className="w-4 h-4" />}
                              {a.category === "electricity" && <Zap className="w-4 h-4" />}
                              {a.category === "food" && <Flame className="w-4 h-4" />}
                              {a.category === "shopping" && <ShoppingBag className="w-4 h-4" />}
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="font-display font-medium text-xs tracking-wide truncate text-slate-800 dark:text-neutral-100">
                                {a.label}
                              </p>
                              <span className="block text-[9px] text-slate-400 font-mono">
                                {new Date(a.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-xs font-semibold text-rose-450 dark:text-rose-500">
                              +{a.carbonAmount.toFixed(1)} kg
                            </span>
                            <button
                              onClick={() => handleDeleteActivity(a.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARBON CHARTS (ANALYTICS) */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Carbon Trend (Span 8) */}
              <div
                className={`lg:col-span-8 rounded-3xl p-6 border transition-all duration-300 ${
                  isDark ? "bg-slate-900/30 border-slate-800/80" : "bg-white/70 border-slate-200"
                } backdrop-blur-md flex flex-col gap-6`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                      Carbon Trend Mitigation
                    </h2>
                    <p className="text-xs text-slate-400">Atmospheric emissions metrics over past logged sequences</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  </div>
                </div>
                <div className="w-full h-72">
                  <TrendLineChart activities={activities} isDark={isDark} />
                </div>
              </div>

              {/* Weekly Comparison segments (Span 4) */}
              <div
                className={`lg:col-span-4 rounded-3xl p-5 border transition-all duration-300 ${
                  isDark ? "bg-slate-900/30 border-slate-800/80" : "bg-white/70 border-slate-200/80"
                } backdrop-blur-md flex flex-col justify-between gap-4 h-full`}
              >
                <div className="text-left">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Emissions By Category
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">Total impact share mapped across habits</p>
                  <WeeklyBarChart activities={activities} isDark={isDark} />
                </div>
                
                <div className="bg-slate-900/40 dark:bg-slate-950/60 rounded-xl border border-slate-100/10 dark:border-slate-800/50 flex items-center gap-3 py-2 px-4 text-left">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 flex items-center justify-center text-[9px] font-mono font-bold text-emerald-400 shrink-0">42%</div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-tighter leading-none">Mitigation Rate</div>
                    <div className="text-xs font-bold text-slate-750 dark:text-white leading-tight mt-0.5">Satisfactory Progress</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Donut Breakdown Segment */}
            <div
              className={`rounded-3xl p-6 border transition-all duration-300 ${
                isDark ? "bg-slate-900/30 border-slate-800/80" : "bg-white/75 border-slate-200"
              } backdrop-blur-md`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 flex flex-col items-center">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 w-full text-left">
                    Category Breakdown Mappings
                  </h3>
                  <CategoryDonutChart
                    activities={activities}
                    onSelectCategory={(cat) => setSelectedDonutCategory(cat)}
                  />
                </div>

                <div className="lg:col-span-5 text-left space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/15 p-4 rounded-2xl">
                    <span className="block font-bold text-sm uppercase text-slate-800 dark:text-emerald-400 tracking-wide">
                      Selected Segment: {selectedDonutCategory}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 leading-relaxed">
                      {selectedDonutCategory === "transport" && "Automobile gasoline trips and hybrid combustion cycles trigger significant carbon weights. Shifting travel metrics towards clean micro-mobility (biking, walking) restores top rating scores instantly."}
                      {selectedDonutCategory === "electricity" && "Home electrical appliance cycles (HVAC, wash loops) form constant baseline demands. Activating eco mode and switching sockets off blocks stand-by leakages."}
                      {selectedDonutCategory === "food" && "Meat logs maintain an approximately 15x higher global carbon multiplier than raw vegetables or vegan entries. Consuming two plant dishes weekly can save over 25kg CO2."}
                      {selectedDonutCategory === "shopping" && "Consumable commerce habits incur hidden manufacturing and shipping weight penalties. Mitigate by purchasing locally-sourced products."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOGGER */}
        {activeTab === "logger" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input Block (Span 5) */}
              <div className="lg:col-span-5">
                <ActivityLogger onAddActivity={handleAddActivity} isDark={isDark} />
              </div>

              {/* Complete Logging Records audits (Span 7) */}
              <div
                className={`lg:col-span-7 rounded-3xl p-5 border transition-all duration-300 ${
                  isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                } backdrop-blur-md`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Raw Certified Activity Logs
                    </h3>
                    <p className="text-xs text-slate-400">Audit and remove logged events below</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-950/40 px-3 py-1 rounded-lg">
                    Total: {activities.length} Recorded
                  </span>
                </div>

                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                  {activities.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 italic text-sm">
                      No logs mapped. Initialize by submitting the logger form today.
                    </div>
                  ) : (
                    activities.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/10 bg-slate-150/10 dark:bg-slate-950/20 hover:bg-slate-950/35 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs ${
                            a.category === "transport" ? "bg-emerald-500/10 text-emerald-400" :
                            a.category === "electricity" ? "bg-cyan-500/10 text-cyan-400" :
                            a.category === "food" ? "bg-amber-500/10 text-amber-400" : "bg-pink-500/10 text-pink-400"
                          }`}>
                            {a.category === "transport" && <Bike className="w-4 h-4" />}
                            {a.category === "electricity" && <Zap className="w-4 h-4" />}
                            {a.category === "food" && <Flame className="w-4 h-4" />}
                            {a.category === "shopping" && <ShoppingBag className="w-4 h-4" />}
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="font-display font-medium text-xs tracking-wide truncate text-slate-800 dark:text-slate-100">
                              {a.label}
                            </p>
                            <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                              {new Date(a.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-xs font-semibold text-rose-450 dark:text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded-lg">
                            +{a.carbonAmount.toFixed(1)} kg
                          </span>
                          <button
                            onClick={() => handleDeleteActivity(a.id)}
                            aria-label={`Remove habit: ${a.label}`}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MILESTONES (GOALS & BADGES) */}
        {activeTab === "milestones" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Active Goals Board (Span 6) */}
              <section className="lg:col-span-7 rounded-3xl p-5 border backdrop-blur-md transition-all duration-300 dark:bg-slate-900/35 dark:border-slate-800 bg-white/70 border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Active Sustainable Goals
                    </h3>
                    <p className="text-xs text-slate-400">Verify milestone targets to boost Eco Score levels</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-mono font-bold">
                    {goals.filter(g => g.isCompleted).length}/{goals.length} Completed
                  </span>
                </div>

                <div className="space-y-4">
                  {goals.map((g) => (
                    <div
                      key={g.id}
                      className={`p-4 rounded-xl border text-left ${
                        g.isCompleted
                          ? "bg-emerald-500/5 border-emerald-500/15"
                          : "bg-slate-950/20 border-slate-850/65"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-bold text-xs tracking-wide">
                          {g.title}
                        </span>
                        {g.isCompleted ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Deadline: {g.deadline}</span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${g.isCompleted ? "bg-emerald-50" : "bg-cyan-400"} rounded-full transition-all duration-500`}
                            style={{
                              width: g.isCompleted
                                ? "100%"
                                : g.category === "food"
                                ? `${Math.min(100, (activities.filter(a => a.category === "food" && a.label.includes("Vegan")).length / g.targetKg) * 100)}%`
                                : "70%"
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>
                            Current Status:{" "}
                            {g.category === "food"
                              ? `${activities.filter(a => a.category === "food" && a.label.includes("Vegan")).length} meal logs`
                              : "Tracking standard levels"}
                          </span>
                          <span>Target ceiling: {g.targetKg} kg max limit</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Honors Badges Panel (Span 5) */}
              <section className="lg:col-span-5 rounded-3xl p-5 border backdrop-blur-md transition-all duration-300 dark:bg-slate-900/35 dark:border-slate-800 bg-white/70 border-slate-200 h-full flex flex-col justify-between">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                    Eco Honors & Awards
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Complete targeted challenges to unlock unique shields</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {badges.map((b) => {
                      const isLocked = b.unlockedAt === null;
                      return (
                        <div
                          key={b.id}
                          className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 cursor-help group relative transition-all duration-200 ${
                            isLocked
                              ? "bg-slate-950/20 border-slate-850/20 opacity-40 hover:opacity-75"
                              : `${b.colorClass} scale-100 hover:scale-[1.03]`
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-950/20 border border-slate-800/50">
                            {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Award className="w-5 h-5 text-emerald-400" />}
                          </div>
                          <span className="text-[10px] uppercase font-display font-bold truncate w-full text-slate-850 dark:text-slate-300 text-slate-800">
                            {b.title}
                          </span>
                          <span className="text-[8px] font-mono text-slate-400">
                            {isLocked ? "Locked" : "Active Winner"}
                          </span>

                          {/* Interactive Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-2.5 text-[9px] leading-relaxed bg-slate-900 text-slate-200 rounded-lg shadow-xl border border-slate-850 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                            <span className="block font-bold text-emerald-400 mb-0.5">{b.title}</span>
                            {b.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-6 pt-3 border-t border-slate-200/20 dark:border-slate-800 text-[10px] text-slate-400 text-center">
                  *Unlocking badges triggers immediate rank level increases.
                </div>
              </section>
            </div>
          </div>
        )}

        {/* AI SUSTAINABILITY ADVISOR DESK */}
        {activeTab === "copilot" && (
          <div className="space-y-6 animate-in duration-300 slide-in-from-bottom-3">
            <div
              className={`rounded-3xl border flex flex-col overflow-hidden transition-all duration-300 ${
                isDark ? "bg-slate-900/40 border-slate-800 shadow-2xl" : "bg-white/80 border-slate-200 shadow-md"
              }`}
            >
              {/* Advisor Header bar details */}
              <div className="p-4 border-b border-slate-200/10 dark:border-slate-800 bg-slate-950/15 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-indigo-400">
                    <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs tracking-tight text-slate-800 dark:text-white uppercase">
                      Gemini Sustainability Copilot
                    </h4>
                    <span className="block text-[8px] font-mono text-emerald-400">● ONLINE PROCESSING</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono hidden md:block">
                  Current Score Factor: {score}/100 Index
                </div>
              </div>

              {/* Message scroll areas */}
              <div className="p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-4 flex flex-col">
                {inLineMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} w-full`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs text-left leading-relaxed ${
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : isDark
                          ? "bg-slate-950/40 border border-slate-800 text-slate-300 rounded-tl-none"
                          : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                      }`}
                    >
                      <span className="block text-[8px] font-semibold uppercase tracking-wider mb-1 opacity-60 font-mono">
                        {m.role === "user" ? "Yadav Aastha" : "Sustainability Advisor"}
                      </span>
                      <p className="whitespace-pre-line font-sans">{m.content}</p>
                    </div>
                  </div>
                ))}
                
                {inLineLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl p-3.5 bg-slate-900/40 border border-slate-800 text-slate-400 rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions pills row */}
              <div className="px-4 py-2 bg-slate-950/10 border-t border-slate-200/10 dark:border-slate-800/40 flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  "Draft a transportation offset log strategy",
                  "Guide stand-by home electricity reduction hacks",
                  "Suggest 3 high-impact vegan meat substitutes",
                  "Calculate commuter footprints per passenger mile"
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInLineInput(s);
                      handleSendInLineMessage(s);
                    }}
                    disabled={inLineLoading}
                    className="px-3 py-1 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/10 dark:border-slate-800 rounded-lg text-[9px] text-slate-400 hover:text-slate-150 transition-all cursor-pointer shrink-0 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <div className="p-3 border-t border-slate-200/10 dark:border-slate-800/80 bg-slate-950/20">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inLineInput.trim()) {
                      handleSendInLineMessage(inLineInput);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={inLineInput}
                    onChange={(e) => setInLineInput(e.target.value)}
                    placeholder="Ask Gemini Sustainability Advisor..."
                    disabled={inLineLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200/10 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 text-left"
                  />
                  <button
                    type="submit"
                    disabled={!inLineInput.trim() || inLineLoading}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/20 disabled:text-slate-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 animate-pulse" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SENIOR ENGINEERING GUEST VALIDATION REGISTER */}
        <FooterAudit isDark={isDark} />

      </div>

      {/* CHAT AI COPILOT WINDOW ASYNC SLIDEOUT DRAWER */}
      <AIAssistant
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        activities={activities}
        score={score}
      />

    </div>
  );
}
