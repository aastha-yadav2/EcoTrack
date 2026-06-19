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
  Send,
  LogIn,
  LogOut,
  Play,
  Globe,
  Users,
  Target,
  Compass,
  TrendingUp,
  Check
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
import { TrendLineChart, WeeklyBarChart, CategoryDonutChart, MonthlyComparisonChart } from "./components/SassCharts";
import { AIAssistant } from "./components/AIAssistant";
import { FooterAudit } from "./components/FooterAudit";
import { IntelligentCalculator } from "./components/IntelligentCalculator";
import { GoalManager } from "./components/GoalManager";
import { QuestGamification } from "./components/QuestGamification";
import { EcoScan } from "./components/EcoScan";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User as FirebaseUser
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError } from "./firebase";

export default function App() {
  // Theme management: defaults to dark mode for carbon dashboard tech-look
  const [isDark, setIsDark] = useState<boolean>(() => {
    const cached = localStorage.getItem("ecotrack-theme");
    return cached ? cached === "dark" : true;
  });

  // Firebase Authentication current User state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Main global states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  // AI-powered states fetched from backend
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [tipOfDay, setTipOfDay] = useState("");
  const [predictedEmissions, setPredictedEmissions] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  // UI state variables
  const [streak, setStreak] = useState<number>(5);
  const [xp, setXp] = useState<number>(150);
  const [greenPoints, setGreenPoints] = useState<number>(550);
  const [lastStreakCheckIn, setLastStreakCheckIn] = useState<string>("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: "not-1", text: "Welcome to EcoTrack! Initialize carbon goals.", time: "10m ago", read: false },
    { id: "not-2", text: "Eco streak raised to 5 days! Streak multiplier active.", time: "2h ago", read: false }
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedDonutCategory, setSelectedDonutCategory] = useState<string>("transport");

  // Tab navigation states
  const [activeTab, setActiveTab] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleTabClick = (tabId: string) => {
    if (tabId === "about") {
      setActiveTab("home");
      setMobileMenuOpen(false);
      setTimeout(() => {
        document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      setActiveTab(tabId);
      setMobileMenuOpen(false);
    }
  };

  // Full-page AI Advisor Chat States
  const [inLineMessages, setInLineMessages] = useState<ChatMessage[]>([
    {
      id: "in-wel-1",
      role: "model",
      content: `Welcome to the **AI Sustainability Advisor Desk**! 🌿\n\nI have analyzed your carbon parameters. You current rank with an Eco-score of **${Math.max(15, Math.min(100, Math.round(100 - (activities.reduce((sum, a) => sum + a.carbonAmount, 0) * 0.16))))}/100**.\n\nAsk me anything! Let help you lower transport waste, optimize electrical home appliances, or draft meat-free meal preps today.`,
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

  // Synchronize authentication and Firestore database contents
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthLoading(true);
        try {
          // 1. Fetch user profile (create active default if not present)
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef).catch(err => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`));
          let currentStreak = 5;
          if (userDocSnap && userDocSnap.exists()) {
            const data = userDocSnap.data();
            currentStreak = data.streakCount ?? 5;
            setStreak(currentStreak);
            setXp(data.xp ?? 150);
            setGreenPoints(data.greenPoints ?? 550);
            setLastStreakCheckIn(data.lastStreakCheckIn ?? "");
          } else {
            await setDoc(userDocRef, {
              userId: currentUser.uid,
              streakCount: 5,
              xp: 150,
              greenPoints: 550,
              lastStreakCheckIn: "",
              theme: isDark ? "dark" : "light"
            }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`));
            setStreak(5);
            setXp(150);
            setGreenPoints(550);
            setLastStreakCheckIn("");
          }

          // 2. Fetch or populate activities
          const activitiesCol = collection(db, "users", currentUser.uid, "activities");
          const activitiesSnap = await getDocs(activitiesCol).catch(err => handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/activities`));
          if (activitiesSnap && !activitiesSnap.empty) {
            const acts: Activity[] = [];
            activitiesSnap.forEach((docSnap) => {
              acts.push(docSnap.data() as Activity);
            });
            acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivities(acts);
          } else {
            setActivities(INITIAL_ACTIVITIES);
            for (const act of INITIAL_ACTIVITIES) {
              await setDoc(doc(db, "users", currentUser.uid, "activities", act.id), act)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/activities/${act.id}`));
            }
          }

          // 3. Fetch or populate goals
          const goalsCol = collection(db, "users", currentUser.uid, "goals");
          const goalsSnap = await getDocs(goalsCol).catch(err => handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/goals`));
          if (goalsSnap && !goalsSnap.empty) {
            const gls: Goal[] = [];
            goalsSnap.forEach((docSnap) => {
              gls.push(docSnap.data() as Goal);
            });
            setGoals(gls);
          } else {
            setGoals(INITIAL_GOALS);
            for (const goal of INITIAL_GOALS) {
              await setDoc(doc(db, "users", currentUser.uid, "goals", goal.id), goal)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/goals/${goal.id}`));
            }
          }

          // 4. Fetch or populate badges
          const badgesCol = collection(db, "users", currentUser.uid, "badges");
          const badgesSnap = await getDocs(badgesCol).catch(err => handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/badges`));
          if (badgesSnap && !badgesSnap.empty) {
            const bdgs: Badge[] = [];
            badgesSnap.forEach((docSnap) => {
              bdgs.push(docSnap.data() as Badge);
            });
            setBadges(bdgs);
          } else {
            setBadges(INITIAL_BADGES);
            for (const bdg of INITIAL_BADGES) {
              await setDoc(doc(db, "users", currentUser.uid, "badges", bdg.id), bdg)
                .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/badges/${bdg.id}`));
            }
          }
        } catch (err) {
          console.error("Firestore sync error:", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setActivities([]);
        setGoals([]);
        setBadges([]);
        setStreak(5);
        setXp(150);
        setGreenPoints(550);
        setLastStreakCheckIn("");
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Theme support
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
    if (user && activities.length > 0) {
      fetchAIInsights();
    }
  }, [activities.length, user]); // Recalculate on listing length modifications

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
  const handleAddActivity = async (newAct: Omit<Activity, "id" | "timestamp">) => {
    const actId = `act-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const activity: Activity = {
      ...newAct,
      id: actId,
      timestamp
    };
    setActivities((prev) => [activity, ...prev]);

    // Push interactive notification feedback
    setNotifications((prev) => [
      {
        id: `not-${Date.now()}`,
        text: `Logged carbon event: ${newAct.label.split("via")[0]} (+25 XP, +10 GP)`,
        time: "Just now",
        read: false
      },
      ...prev
    ]);

    // Handle gamification updates
    let updatedXP = xp + 25;
    let updatedGP = greenPoints + 10;
    setXp(updatedXP);
    setGreenPoints(updatedGP);

    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        xp: updatedXP,
        greenPoints: updatedGP
      }).catch(() => {});
    }

    // Save to Firestore
    if (user) {
      await setDoc(doc(db, "users", user.uid, "activities", actId), activity)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/activities/${actId}`));
    }

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

    // Sync updated goals to Firestore
    if (user) {
      for (const g of updatedGoals) {
        await setDoc(doc(db, "users", user.uid, "goals", g.id), g)
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/goals/${g.id}`));
      }
    }

    if (unlockedABadge) {
      // Trigger badge unlock for "Power Miser" or other locks
      const updatedBadges = badges.map((b) => {
        if (b.unlockedAt === null) {
          return { ...b, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      setBadges(updatedBadges);
      
      // Sync updated badges to Firestore
      if (user) {
        for (const b of updatedBadges) {
          await setDoc(doc(db, "users", user.uid, "badges", b.id), b)
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/badges/${b.id}`));
        }
      }

      setNotifications((prev) => [
        { id: `not-bdg-${Date.now()}`, text: "🏆 Exclusive badge unlocked! Check your honors drawer below.", time: "Just now", read: false },
        ...prev
      ]);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setNotifications((prev) => [
      { id: `not-del-${Date.now()}`, text: "Activity log removed. Offsets re-balanced (-10 XP, -5 GP).", time: "Just now", read: false },
      ...prev
    ]);

    // Handle minor deduction
    let updatedXP = Math.max(0, xp - 10);
    let updatedGP = Math.max(0, greenPoints - 5);
    setXp(updatedXP);
    setGreenPoints(updatedGP);

    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        xp: updatedXP,
        greenPoints: updatedGP
      }).catch(() => {});

      await deleteDoc(doc(db, "users", user.uid, "activities", id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/activities/${id}`));
    }
  };

  const handleSaveGoal = async (goal: Goal) => {
    let exists = false;
    const updated = goals.map((g) => {
      if (g.id === goal.id) {
        exists = true;
        return goal;
      }
      return g;
    });

    const finalGoals = exists ? updated : [...goals, goal];
    setGoals(finalGoals);

    if (user) {
      await setDoc(doc(db, "users", user.uid, "goals", goal.id), goal)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/goals/${goal.id}`));
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setNotifications((prev) => [
      { id: `not-goal-del-${Date.now()}`, text: "Carbon target removed from partition.", time: "Just now", read: false },
      ...prev
    ]);

    if (user) {
      await deleteDoc(doc(db, "users", user.uid, "goals", goalId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/goals/${goalId}`));
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setNotificationOpen(false);
  };

  const handleUpdateXPAndPoints = async (xpGain: number, gpGain: number, unlockedBadgeId?: string) => {
    let nextXP = xp;
    let nextGP = greenPoints;

    setXp((prev) => {
      nextXP = prev + xpGain;
      return nextXP;
    });
    setGreenPoints((prev) => {
      nextGP = prev + gpGain;
      return nextGP;
    });

    let updatedBadges = [...badges];
    if (unlockedBadgeId) {
      updatedBadges = badges.map((b) => {
        if (b.id === unlockedBadgeId) {
          return { ...b, unlockedAt: new Date().toISOString() };
        }
        return b;
      });
      setBadges(updatedBadges);
    }

    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        xp: nextXP,
        greenPoints: nextGP
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));

      if (unlockedBadgeId) {
        const badgeObj = updatedBadges.find((b) => b.id === unlockedBadgeId);
        if (badgeObj) {
          await setDoc(doc(db, "users", user.uid, "badges", unlockedBadgeId), badgeObj)
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/badges/${unlockedBadgeId}`));
        }
      }
    }

    setNotifications((prev) => [
      {
        id: `not-xp-${Date.now()}`,
        text: `Claimed +${xpGain} XP & +${gpGain} Green Points ledger rewards!`,
        time: "Just now",
        read: false
      },
      ...prev
    ]);
  };

  const handleCheckInDaily = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    let nextStreak = streak + 1;
    setStreak(nextStreak);
    setLastStreakCheckIn(todayStr);

    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        streakCount: nextStreak,
        lastStreakCheckIn: todayStr
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
    }

    setNotifications((prev) => [
      {
        id: `not-streak-checkin-${Date.now()}`,
        text: `🔥 Habit Check-In logged! Eco Streak raised to ${nextStreak} Days.`,
        time: "Just now",
        read: false
      },
      ...prev
    ]);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google sign in failed:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const renderLoginRequired = (featureName: string) => {
    return (
      <div className={`p-10 rounded-3xl border text-center space-y-6 max-w-lg mx-auto transition-all duration-300 ${
        isDark ? "bg-slate-900/50 border-slate-800 shadow-2xl" : "bg-white border-slate-200 shadow-xl"
      } backdrop-blur-xl animate-in fade-in duration-300`}>
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
            Unlock {featureName} 🌿
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal max-w-sm mx-auto">
            Create an account to track your transport mileage, energy offsets, dining baselines, and sync them securely with our real-time smart servers.
          </p>
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3.5 rounded-xl cursor-pointer transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
        >
          <LogIn className="w-4 h-4" />
          <span>Get Started with Google</span>
        </button>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 ${
        isDark ? "bg-[#090d16] text-slate-200" : "bg-slate-50 text-slate-800"
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400 font-mono">Initializing planetary metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-6 px-4 md:px-8 transition-colors duration-300 font-sans ${
        isDark ? "bg-[#090d16] text-slate-200" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* UNIFIED DESIGN NAVIGATION & HEADER BAR */}
        <header
          className={`rounded-2xl px-6 py-4 border flex items-center justify-between gap-4 shrink-0 transition-all duration-300 relative z-50 ${
            isDark ? "bg-slate-900/60 border-slate-800 shadow-2xl" : "bg-white/80 border-slate-200 shadow-lg"
          } backdrop-blur-xl`}
          id="ecotrack-header"
        >
          {/* Brand Identification Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => handleTabClick("home")}>
            <div className="w-8 h-8 rounded-lg bg-[#0c3e2e] dark:bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
              <Leaf className="w-4.5 h-4.5 text-emerald-400 dark:text-slate-950" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-none tracking-tight text-slate-905 dark:text-white">
                Eco<span className="text-emerald-500 dark:text-emerald-400">Track</span>
              </h1>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                Planetary AI
              </p>
            </div>
          </div>

          {/* Desktop Navigation Link row */}
          <nav className="hidden lg:flex items-center gap-7">
            {[
              { id: "home", label: "Home" },
              { id: "calculator", label: "Calculator" },
              { id: "ecoscan", label: "EcoScan AI" },
              { id: "dashboard", label: "Dashboard" },
              { id: "goals", label: "Goals" },
              { id: "community", label: "Community" },
              { id: "about", label: "About" }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  type="button"
                  className={`relative py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer outline-none ${
                    isActive
                      ? "text-[#0c3e2e] dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0c3e2e] dark:bg-emerald-400 rounded-full animate-in fade-in duration-200" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Controls Action panel */}
          <div className="flex items-center gap-3">
            
            {/* Theme selector Sun/Moon button */}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label="Toggle theme display mode"
              type="button"
              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer outline-none ${
                isDark ? "hover:bg-slate-800 border-slate-800 text-slate-300" : "hover:bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Authenticated Mode options */}
            {user ? (
              <div className="flex items-center gap-2">
                {/* AI Advisor side trigger */}
                <button
                  onClick={() => setAssistantOpen(true)}
                  aria-label="Open helper side panel"
                  type="button"
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.35)] cursor-pointer outline-none"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                </button>

                {/* Notifications ring dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationOpen(!notificationOpen)}
                    aria-label="Toggle notification menu"
                    type="button"
                    className={`p-2 rounded-xl border transition-all cursor-pointer outline-none ${
                      isDark ? "hover:bg-slate-800 border-slate-800 text-slate-300" : "hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="relative">
                      <Bell className="w-4 h-4" />
                      {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />}
                    </div>
                  </button>

                  {notificationOpen && (
                    <div
                      className={`absolute right-0 mt-2.5 w-72 z-50 p-4 rounded-xl border shadow-2xl ${
                        isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                      }`}
                      id="notifications-dropdown"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notifications</h4>
                        {notifications.length > 0 && (
                          <button onClick={handleClearNotifications} className="text-[10px] text-emerald-500 hover:underline cursor-pointer">Clear All</button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-[10px] text-slate-400 text-center py-4 italic">No alerts mapped.</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="text-xs pb-2 border-b border-slate-800/20 last:border-0 last:pb-0 text-left">
                              <p className="text-slate-700 dark:text-slate-300 text-[11px]">{n.text}</p>
                              <span className="block text-[8px] text-slate-400 mt-0.5">{n.time}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile panel with Logout */}
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <img
                    src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=40&h=40"}
                    referrerPolicy="no-referrer"
                    alt="Current profile logo"
                    className="w-7.5 h-7.5 rounded-lg border border-emerald-500/30 object-cover hidden sm:block shrink-0"
                  />
                  <div className="hidden xl:block text-left max-w-[80px]">
                    <span className="block text-[10px] font-bold truncate text-slate-700 dark:text-slate-300">
                      {user.displayName || "Sustainer"}
                    </span>
                    <span className="block text-[8px] font-semibold text-emerald-500">Lv14 · Sage</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    aria-label="Terminate session"
                    type="button"
                    className={`p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer outline-none`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Guest Auth controls matching mockup! */
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className={`hidden sm:block px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-none ${
                    isDark
                      ? "border-slate-800 hover:bg-slate-800 text-slate-250"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0c3e2e] hover:bg-[#072a1f] dark:bg-emerald-600 dark:hover:bg-emerald-505 rounded-xl transition-all shadow-[0_4px_16px_rgba(12,62,46,0.25)] flex items-center gap-1 cursor-pointer outline-none"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mobile hamburger menu indicator */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="lg:hidden p-2 rounded-xl border border-slate-800/10 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white outline-none cursor-pointer"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

          </div>
        </header>

        {/* Mobile Slide Drawer Links */}
        {mobileMenuOpen && (
          <div className="lg:hidden p-4 rounded-2xl border border-emerald-500/10 bg-slate-150/90 dark:bg-slate-900/90 backdrop-blur-2xl animate-in slide-in-from-top-3 duration-250 space-y-2 relative z-40 text-left">
            {[
              { id: "home", label: "Home" },
              { id: "calculator", label: "Calculator" },
              { id: "ecoscan", label: "EcoScan AI" },
              { id: "dashboard", label: "Dashboard" },
              { id: "goals", label: "Goals" },
              { id: "community", label: "Community" },
              { id: "about", label: "About" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full block text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-500/15 text-emerald-505 dark:text-emerald-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* CONDITIONALLY RENDERED SEGMENTS BASED ON ACTIVE TAB */}
        {activeTab === "home" && (
          <div className="space-y-16 animate-in fade-in duration-300">
            {/* HERO PANEL */}
            <div className={`rounded-3xl p-8 border transition-all duration-300 overflow-hidden relative ${
              isDark 
                ? "bg-slate-900/40 border-slate-800 shadow-2xl bg-gradient-to-br from-slate-900/40 via-[#0a1224]/50 to-slate-900/35" 
                : "bg-white border-slate-200 shadow-lg bg-gradient-to-br from-white via-emerald-50/20 to-slate-50/50"
            }`}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 text-left">
                {/* Left Text content */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 animate-pulse">
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                    Now Backed by Gemini 2.0 AI Integration
                  </div>
                  
                  <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl tracking-tight leading-tight">
                    Track Today. <br />
                    <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 bg-clip-text text-transparent">
                      Transform Tomorrow.
                    </span>
                  </h2>
                  
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Empowering individuals, families, and neighborhood communities to map, visualize, and de-risk our planetary footprint through real-time AI atmospheric analytics. Built with secure cloud database synchronizations.
                  </p>
                  
                  {/* Buttons click portal */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      onClick={() => handleTabClick(user ? "dashboard" : "calculator")}
                      className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#0c3e2e] hover:bg-[#072a1f] dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-[0_10px_25px_rgba(16,185,129,0.3)] flex items-center gap-2 cursor-pointer outline-none active:scale-95"
                    >
                      <span>Get Started Free</span>
                      <ChevronRight className="w-4.5 h-4.5 animate-pulse" />
                    </button>
                    <button
                      onClick={() => {
                        window.scrollTo({ top: document.getElementById("about-section")?.offsetTop || 1200, behavior: "smooth" });
                      }}
                      className={`px-6 py-3.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 cursor-pointer outline-none active:scale-95 ${
                        isDark 
                          ? "border-slate-800 hover:bg-slate-800 text-slate-300" 
                          : "border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current text-emerald-500" />
                      <span>Learn Science Model</span>
                    </button>
                  </div>
                  
                  {/* Cumulative Indicators Stack */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200/10 dark:border-slate-800/60 pt-6 max-w-md">
                    <div>
                      <span className="block text-xl font-bold font-mono text-slate-850 dark:text-slate-100">12,400+ Days</span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">Cumulative Habit Streaks Active</span>
                    </div>
                    <div>
                      <span className="block text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">2.4M+ kg CO2e</span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">Atmospheric Offsets Mapped</span>
                    </div>
                  </div>
                </div>
                
                {/* Right Illustration side */}
                <div className="lg:col-span-5 relative flex items-center justify-center min-h-[400px]">
                  {/* Earth Core glowing */}
                  <div className="absolute w-72 h-72 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
                  
                  {/* Elegant spinning Earth globe SVG */}
                  <div className="relative w-64 h-64 select-none shrink-0 cursor-help transition-all transform hover:scale-105 duration-500 flex items-center justify-center">
                    <svg className="w-full h-full text-emerald-500/30 dark:text-emerald-400/25 animate-[spin_40s_linear_infinite]" viewBox="0 0 100 100" fill="none">
                      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" />
                      <ellipse cx="50" cy="50" rx="46" ry="18" stroke="currentColor" strokeWidth="0.8" />
                      <ellipse cx="50" cy="50" rx="18" ry="46" stroke="currentColor" strokeWidth="0.8" />
                      <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.8" />
                      <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.8" />
                      {/* Interactive glowing dots representing active global sustainer hubs */}
                      <circle cx="28" cy="35" r="3" fill="#10b981" className="animate-ping" style={{ animationDuration: "1.5s" }} />
                      <circle cx="28" cy="35" r="2" fill="#10b981" />
                      <circle cx="72" cy="65" r="3.5" fill="#06b6d4" className="animate-ping" style={{ animationDuration: "2s" }} />
                      <circle cx="72" cy="65" r="2" fill="#06b6d4" />
                      <circle cx="50" cy="18" r="4" fill="#3b82f6" className="animate-ping" style={{ animationDuration: "3s" }} />
                      <circle cx="50" cy="18" r="2.5" fill="#3b82f6" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Leaf className="w-16 h-16 text-emerald-500 dark:text-emerald-400 animate-bounce" style={{ animationDuration: "3.5s" }} />
                    </div>
                  </div>
                  
                  {/* FLOATING WIDGET 1: Carbon Score Arc */}
                  <div className="absolute top-2 -left-4 p-3 rounded-xl border border-emerald-500/20 bg-slate-100/90 dark:bg-slate-900/85 backdrop-blur-md shadow-lg shrink-0 flex items-center gap-3 animate-bounce" style={{ animationDuration: "12s" }}>
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="3" />
                        <circle cx="16" cy="16" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="88" strokeDashoffset="24" strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-[8px] font-mono font-bold text-slate-850 dark:text-white">72</span>
                    </div>
                    <div className="text-left font-sans">
                      <span className="block text-[8px] font-mono text-slate-400 leading-none">Carbon Score</span>
                      <span className="text-[10px] font-bold text-emerald-500">Good Progress</span>
                    </div>
                  </div>
                  
                  {/* FLOATING WIDGET 2: AI CO2 Insight Tip */}
                  <div className="absolute top-12 -right-4 p-3.5 rounded-2xl border border-indigo-500/20 bg-white dark:bg-slate-950 shadow-2xl shrink-0 max-w-[210px] space-y-1.5 text-left animate-pulse" style={{ animationDuration: "6s" }}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-450">AI CO2 Insight</span>
                    </div>
                    <p className="text-[10px] leading-tight text-slate-600 dark:text-slate-350">
                      Replacing 3 travel logs with train lines mitigates <b>14.2 kg</b> this week!
                    </p>
                    <button onClick={() => setAssistantOpen(true)} className="text-[8px] font-bold text-emerald-500 hover:underline flex items-center gap-0.5 cursor-pointer">
                      <span>Apply insight</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  
                  {/* FLOATING WIDGET 3: EcoScan Frame Quickdrag */}
                  <div className="absolute bottom-6 -left-8 p-3 rounded-2xl border border-slate-800/10 dark:border-slate-800/80 bg-slate-150/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg max-w-[190px] text-left shrink-0">
                    <div className="border border-dashed border-slate-750/50 rounded-xl p-2.5 text-center space-y-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mx-auto" />
                      <span className="block text-[8px] font-bold uppercase text-slate-400 font-mono tracking-wider">EcoScan AI Scanner</span>
                      <span className="block text-[10px] text-slate-600 dark:text-slate-350">Drag utility bills here</span>
                      <button onClick={() => setActiveTab("ecoscan")} className="mt-1 px-2.5 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-[8px] transition-all cursor-pointer">
                        Upload Receipt
                      </button>
                    </div>
                  </div>
                  
                  {/* FLOATING WIDGET 4: Safe month offsets sparkline */}
                  <div className="absolute bottom-2 -right-8 p-3 rounded-xl border border-emerald-500/20 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md shrink-0 flex flex-col gap-1 text-left">
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest leading-none">Saved This Week</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold font-mono text-emerald-500">18.6 kg</span>
                      <span className="text-[8px] text-slate-400">CO2 Equivalent</span>
                    </div>
                    {/* Tiny visual SVG Sparkline line */}
                    <svg className="w-28 h-6 text-emerald-400" viewBox="0 0 100 20" fill="none">
                      <path d="M0,18 C15,14 30,2 45,15 C60,2 75,5 100,1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M0,18 C15,14 30,2 45,15 C60,2 75,5 100,1 L100,20 L0,20 Z" fill="rgba(16,185,129,0.06)" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SaaS FEATURES BENTO GRID SECTION */}
            <div className="space-y-8" id="platform-features-bento">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-full">
                  Platform Horizon Suite
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-800 dark:text-slate-50">
                  Carbon De-Risking Tools Under One Roof 🌿
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                  Seamlessly pairing physical resource analytics with robust machine intelligence to accelerate your daily offset goals.
                </p>
              </div>

              {/* Bento grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Columns Span 7 (Left nested 5 grid items) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Calculator card */}
                  <div 
                    onClick={() => setActiveTab("calculator")}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group ${
                      isDark ? "bg-slate-900/30 border-slate-850 hover:border-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-500/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-805 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                      Atmospheric Calculator
                    </h4>
                    <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 leading-relaxed">
                      Convert vehicle travel miles, plant diets, and electricity schedules into precise atmospheric impacts.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-555 dark:text-emerald-400 mt-4 group-hover:translate-x-1 transition-transform">
                      <span>Model baseline</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* EcoScan AI card */}
                  <div 
                    onClick={() => setActiveTab("ecoscan")}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group ${
                      isDark ? "bg-slate-900/30 border-slate-850 hover:border-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-500/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-455 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-805 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                      EcoScan receipt Audit
                    </h4>
                    <p className="text-xs text-slate-455 dark:text-slate-400 mt-1 leading-relaxed">
                      Instant photographic receipt auditing scans utility details and grocery cards with smart OCR models.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-500 mt-4 group-hover:translate-x-1 transition-transform">
                      <span>Scan utility files</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Smart Advisor coach */}
                  <div 
                    onClick={() => setAssistantOpen(true)}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group ${
                      isDark ? "bg-slate-900/30 border-slate-850 hover:border-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-500/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                      <Compass className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-805 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">
                      1-on-1 AI Advisor
                    </h4>
                    <p className="text-xs text-slate-455 dark:text-slate-400 mt-1 leading-relaxed">
                      Consult with specialized conversational setups. Generate bespoke mitigation hack sheets in seconds.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500 mt-4 group-hover:translate-x-1 transition-transform">
                      <span>Launch copilot</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Milestones badges cards */}
                  <div 
                    onClick={() => setActiveTab("goals")}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group ${
                      isDark ? "bg-slate-900/30 border-slate-850 hover:border-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-500/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-550 dark:text-amber-500 flex items-center justify-center mb-3">
                      <Target className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-805 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                      Goals & Honors Shields
                    </h4>
                    <p className="text-xs text-slate-455 dark:text-slate-400 mt-1 leading-relaxed">
                      Complete verified challenge intervals, maintain streak counters, and claim ecological status accolades.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-550 dark:text-amber-400 mt-4 group-hover:translate-x-1 transition-transform">
                      <span>Unlock trophies</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Neighborhood Community Challenge card */}
                  <div 
                    onClick={() => setActiveTab("community")}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group sm:col-span-2 ${
                      isDark ? "bg-slate-900/30 border-slate-850 hover:border-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-500/20"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-650 dark:text-teal-550 flex items-center justify-center mb-3">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-105 group-hover:text-teal-555 dark:group-hover:text-teal-400 transition-colors">
                          Collective Neighbor Challenges
                        </h4>
                        <p className="text-xs text-slate-455 dark:text-slate-400 mt-1 leading-relaxed max-w-md">
                          Join neighborhood clean energy challenges. Compete side-by-side with localized warriors to establish zero-carbon blocks.
                        </p>
                      </div>
                      <span className="hidden sm:inline-block font-mono text-[9px] px-2.5 py-1 bg-teal-500/10 text-teal-500 dark:text-teal-400 rounded-lg">
                        Active Global League
                      </span>
                    </div>
                  </div>

                </div>

                {/* Right Column Span 5: Masterful Collective Impact High-Contrast Block */}
                <div className="lg:col-span-5 rounded-3xl p-6 relative overflow-hidden bg-emerald-950 dark:bg-[#06241a] border border-emerald-900/60 shadow-2xl flex flex-col justify-between text-left group">
                  {/* Subtle vector grid lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent)] pointer-events-none" />
                  
                  <div className="space-y-4 relative z-15">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-555/30">
                      <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
                      Planetary Statistics Ledgers
                    </span>
                    
                    <h3 className="font-display font-extrabold text-2xl text-white tracking-tight leading-snug">
                      Join Our Collaborative <br/>
                      <span className="text-emerald-300">Sustainable Movement</span>
                    </h3>
                    <p className="text-xs text-emerald-100/70 leading-relaxed">
                      Every travel log, utility audit, and compost record is logged onto secure ledger protocols to establish planetary baseline indexes.
                    </p>
                  </div>
                  
                  {/* 4 cleanly designed white-impact statistics lines */}
                  <div className="space-y-[15px] my-6 relative z-10 border-y border-emerald-900/40 py-5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-100">Carbon Offset Mapped</span>
                      </div>
                      <span className="font-mono text-xs font-black text-white">2,450,230 kg</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-105">Active Climate Sustainer Warrior Hubs</span>
                      </div>
                      <span className="font-mono text-xs font-black text-white">12,305 Users</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-105">Prescribed Challenges Completed</span>
                      </div>
                      <span className="font-mono text-xs font-black text-white">5,244 Milestones</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-105">Planting Equivalent Multiplier</span>
                      </div>
                      <span className="font-mono text-xs font-black text-white">3,120 Trees</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    className="relative z-10 w-full py-3.5 bg-white hover:bg-emerald-500 hover:text-white text-slate-900 font-bold rounded-2xl text-xs tracking-wider uppercase transition-all shadow-xl cursor-pointer outline-none active:scale-95"
                  >
                    Join the Global Movement →
                  </button>
                  
                </div>

              </div>
            </div>

            {/* PROMOTIONAL BONUS BANNER BOX */}
            <div className={`rounded-xl p-6 border text-left relative overflow-hidden transition-all ${
              isDark 
                ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/10 animate-pulse" 
                : "bg-gradient-to-r from-emerald-50/70 to-teal-50/45 border-emerald-500/20"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Secure Firebase Storage Active
                  </h4>
                  <p className="text-xs text-slate-400">
                    Your records are secured by isolated Cloud databases. Data is maintained safely and syncing continuously.
                  </p>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2.5 bg-[#0c3e2e] dark:bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shrink-0 transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>
            </div>

            {/* ABOUT US SECTION */}
            <div 
              id="about-section"
              className={`rounded-3xl p-8 border transition-all duration-300 relative scroll-mt-6 text-left ${
                isDark ? "bg-slate-900/20 border-slate-800/80" : "bg-white/60 border-slate-200"
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side text summary */}
                <div className="lg:col-span-5 space-y-4 font-sans text-left">
                  <span className="text-[10px] font-mono font-black uppercase text-emerald-500 tracking-widest leading-none">
                    About EcoTrack Platform
                  </span>
                  
                  <h3 className="font-display font-black text-2xl tracking-tight text-slate-800 dark:text-slate-50 leading-tight">
                    Clean Code. <br/>
                    Verified Climate Action.
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Formed by clean climate-tech engineers, EcoTrack is a modular computing platform built to accelerate grass-root decarbonization protocols globally. Our software layer translates carbon-heavy resource cycles into digital transparency, empowering continuous sustainable habit formations.
                  </p>
                  
                  <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed">
                    By coordinating custom calculations with robust server layers and client persistence caches, our systems maintain an optimized baseline with zero telemetry trackers.
                  </p>
                </div>

                {/* Right side pillars mapping list */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* Pillar 1 */}
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950/40 border-slate-850/60" : "bg-slate-50/50 border-slate-200/60"
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2.5">
                      <Footprints className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-755 dark:text-slate-200 uppercase tracking-wide">
                      Atmospheric Physics
                    </h5>
                    <p className="text-[10px] leading-relaxed text-slate-400 mt-1.5">
                      Using verified scientific atmospheric multipliers modeled from EPA frameworks. Auto-converts transportation travel types, meat weights, and HVAC logs.
                    </p>
                  </div>

                  {/* Pillar 2 */}
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950/40 border-slate-850/60" : "bg-slate-50/50 border-slate-200/60"
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-755 dark:text-slate-200 uppercase tracking-wide">
                      Durable Ledgers
                    </h5>
                    <p className="text-[10px] leading-relaxed text-slate-400 mt-1.5">
                      Injected cloud synchronizations securely record logs inside personal Firebase Firestore indices, ensuring your achievements and milestones survive cache cleans.
                    </p>
                  </div>

                  {/* Pillar 3 */}
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950/40 border-slate-850/60" : "bg-slate-50/50 border-slate-200/60"
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                      <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: "10s" }} />
                    </div>
                    <h5 className="font-bold text-xs text-slate-755 dark:text-slate-200 uppercase tracking-wide">
                      Gemini Co2 Advisor
                    </h5>
                    <p className="text-[10px] leading-relaxed text-slate-400 mt-1.5">
                      Instant intelligence analysis scanning inputted records and utility receipts to provide localized, high-impact suggestions that boost your score rating.
                    </p>
                  </div>

                </div>

              </div>
            </div>

            {/* TRADITIONAL HIGH-END FOOTER SECTION */}
            <div className={`pt-12 pb-6 border-t font-sans text-left relative z-10 ${
              isDark ? "border-slate-800/80" : "border-slate-200"
            }`}>
              {/* Main Footer columns */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
                
                {/* Brand brief Column (Span 2) */}
                <div className="space-y-4 col-span-2">
                  <div className="flex items-center gap-2.5 animate-in fade-in">
                    <div className="w-8 h-8 rounded-lg bg-[#0c3e2e] dark:bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <Leaf className="w-4.5 h-4.5 text-emerald-400 dark:text-slate-950" />
                    </div>
                    <h2 className="font-display font-bold text-base leading-none tracking-tight text-slate-850 dark:text-white">
                      Eco<span className="text-emerald-500 dark:text-emerald-400">Track</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                    EcoTrack coordinates continuous carbon-footprint modeling, receipt auditing OCR, and community leagues to de-risk our atmospheric metrics. Built with clean technologies.
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Planetary Index Version 4.8.2-Prod
                  </p>
                </div>

                {/* Column 1: Product */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Product</span>
                  <ul className="space-y-2 text-xs">
                    <li><button onClick={() => setActiveTab("calculator")} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">Atmospheric Calculator</button></li>
                    <li><button onClick={() => setActiveTab("ecoscan")} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">photographic Scan</button></li>
                    <li><button onClick={() => setAssistantOpen(true)} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">Gemini Co2 Copilot</button></li>
                    <li><button onClick={() => setActiveTab("goals")} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">Trophy Milestones</button></li>
                  </ul>
                </div>

                {/* Column 2: Resources */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Resources</span>
                  <ul className="space-y-2 text-xs">
                    <li><button onClick={() => {
                      window.scrollTo({ top: document.getElementById("about-section")?.offsetTop || 1200, behavior: "smooth" });
                    }} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">Physics Multipliers</button></li>
                    <li><a href="https://www.epa.gov/ghgreporting" target="_blank" rel="noopener noreferrer" className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors block text-left">EPA Guidelines</a></li>
                    <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors block text-left">Sustainable Code Repository</a></li>
                    <li><a href="https://news.google.com" target="_blank" rel="noopener noreferrer" className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors block text-left">Climate Bulletins</a></li>
                  </ul>
                </div>

                {/* Column 3: Company */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Company</span>
                  <ul className="space-y-2 text-xs">
                    <li><button onClick={() => {
                      window.scrollTo({ top: document.getElementById("about-section")?.offsetTop || 1200, behavior: "smooth" });
                    }} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block text-left">About Us</button></li>
                    <li><a href="mailto:support@ecotrack.org" className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors block text-left">Security Auditing</a></li>
                    <li><button onClick={() => setActiveTab("community")} className="text-slate-505 dark:text-slate-400 hover:text-emerald-500 hover:underline transition-colors cursor-pointer block block text-left">Neighborhood Leagues</button></li>
                    <li><button className="text-slate-400 text-left cursor-not-allowed block text-left" disabled>Careers (We are hiring!)</button></li>
                  </ul>
                </div>

              </div>

              {/* Bottom bar copyrights */}
              <div className={`mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono ${
                isDark ? "border-slate-800/60" : "border-slate-200/80"
              }`}>
                <span>© 2026 EcoTrack atmospheric Systems, Inc. All rights reserved.</span>
                <div className="flex gap-4">
                  <a href="#about-section" className="hover:text-emerald-500 hover:underline">Privacy ledger policy</a>
                  <span>·</span>
                  <a href="#about-section" className="hover:text-emerald-500 hover:underline">Terms of sustainable use</a>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "calculator" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <IntelligentCalculator 
              user={user} 
              isDark={isDark} 
              onOpenSignIn={handleGoogleSignIn} 
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* HERO WELCOME HEADER & STATUS COUNTER */}
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
                    Unified Carbon Control Hub
                  </div>
                  <h2 className="font-display font-bold text-3xl tracking-tight text-slate-800 dark:text-slate-50">
                    Welcome Back, {user?.displayName || user?.email?.split("@")[0] || "Explorer"}! 🌿
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                    Great progress! Your committed sustainable habits are making a real, direct impact on mitigating carbon baselines. Use the navigation portal below to explore analytics, log events, or consult the AI advisor.
                  </p>
                </div>
                
                {/* Micro counters */}
                <div className="flex gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800/10 text-left shrink-0">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-none font-bold font-mono">STREAK WEEK</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Flame className="w-4.5 h-4.5 text-orange-500 animate-bounce" />
                      <span className="text-lg font-bold font-mono text-slate-800 dark:text-white">{streak} Days</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800/10 text-left shrink-0">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-none font-bold font-mono">CURRENT RANK TIER</span>
                    <div className="flex items-center gap-1.5 mt-2">
                       <Award className="w-4.5 h-4.5 text-teal-400" />
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{tier.name.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HIGH-LEVEL METRICS OVERVIEW */}
            <Metrics
              totalEmissions={carbonTotal}
              carbonSaved={carbonSaved}
              score={score}
              goalProgress={activeGoalProgress}
              isDark={isDark}
            />

            {/* ACTIVE PORTALS: NAVIGATE SECTIONS */}
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="font-display font-bold text-lg dark:text-white text-slate-900">
                  Interactive Control Panels & Sections
                </h3>
                <p className="text-xs text-slate-400">Click any card panel or use the top navigation bar to access specific modules directly</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Analytics Portal */}
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`p-6 rounded-3xl border text-left flex flex-col justify-between h-56 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group cursor-pointer ${
                    isDark ? "bg-slate-900/40 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-300"
                  }`}
                  id="portal-analytics"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-450 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">Carbon Charts</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Analyze 7-day atmospheric trends, weekly weight categories, and lifestyle slice donut charts.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold flex items-center gap-1 text-cyan-550 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
                     Access Analytics <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* 2. Activity Logger Portal */}
                <button
                  onClick={() => setActiveTab("logger")}
                  className={`p-6 rounded-3xl border text-left flex flex-col justify-between h-56 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group cursor-pointer ${
                    isDark ? "bg-slate-900/40 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-300"
                  }`}
                  id="portal-logger"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">Activity Logger</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Record daily transport, electricity usage, shopping, and meals to recalculate impact instantly.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold flex items-center gap-1 text-emerald-500 group-hover:translate-x-1 transition-transform">
                     Open Logger <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* 3. Goals & Badges Portal */}
                <button
                  onClick={() => setActiveTab("milestones")}
                  className={`p-6 rounded-3xl border text-left flex flex-col justify-between h-56 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group cursor-pointer ${
                    isDark ? "bg-slate-900/40 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-300"
                  }`}
                  id="portal-milestones"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">Goals & Badges</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Review target ceilings and check out unlocked milestones and awards in your eco honor hall.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold flex items-center gap-1 text-amber-500 group-hover:translate-x-1 transition-transform">
                     Review Goals <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* 4. AI Advisor Portal */}
                <button
                  onClick={() => setActiveTab("copilot")}
                  className={`p-6 rounded-3xl border text-left flex flex-col justify-between h-56 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group cursor-pointer ${
                    isDark ? "bg-slate-900/40 border-slate-800 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:border-emerald-300"
                  }`}
                  id="portal-copilot"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5 animate-pulse text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">Gemini AI Copilot</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Interact with our smart conversational agent to draft vegetarian recipes and commuting plans.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold flex items-center gap-1 text-indigo-505 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                     Chat with AI <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>

              </div>
            </div>

            {/* BENTO BOX GRID STRATEGIC SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Today's Recommendation & Highlight */}
              <div
                className={`rounded-3xl p-5 border text-left flex flex-col justify-between gap-4 transition-all duration-300 ${
                  isDark ? "bg-indigo-600/10 border-indigo-500/15 text-slate-200" : "bg-indigo-50/50 border-indigo-100 text-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest font-mono">
                      Climate Strategy Highlight
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tipOfDay || DYNAMIC_TIPS[0]}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200/10 dark:border-slate-800/40 text-[10px] text-slate-400">
                  Tip is re-generated daily based on live habits
                </div>
              </div>

              {/* Active Community Challenge Progress */}
              <div
                className={`rounded-3xl p-5 border text-left flex flex-col justify-between gap-4 transition-all duration-300 ${
                  isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                }`}
              >
                <div>
                  <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">
                    Active Challenge
                  </span>
                  <h4 className="text-xs font-bold text-slate-805 dark:text-slate-100 truncate">
                    {ECO_CHALLENGE.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 mb-3">Joint efforts unified to lower national consumption averages.</p>
                  
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${(ECO_CHALLENGE.currentSaved / ECO_CHALLENGE.targetTotalSaved) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>{ECO_CHALLENGE.currentSaved} kg saved</span>
                      <span>Target: {ECO_CHALLENGE.targetTotalSaved} kg</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Ends globally in <b>{ECO_CHALLENGE.daysRemaining} days</b>
                </div>
              </div>

              {/* Top Source Spotlight */}
              {(() => {
                const breakdown = { transport: 0, electricity: 0, food: 0, shopping: 0 };
                activities.forEach((a) => {
                  if (breakdown[a.category] !== undefined) breakdown[a.category] += a.carbonAmount;
                });
                let maxCat = "transport";
                let maxVal = breakdown.transport;
                Object.entries(breakdown).forEach(([cat, val]) => {
                  if (val > maxVal) {
                    maxCat = cat;
                    maxVal = val;
                  }
                });
                const catLabels = {
                  transport: "Transport Trips & Commutes",
                  electricity: "Standby Watt Power Loops",
                  food: "Dietary Carbon Footprint",
                  shopping: "Incurred Retail Purchases"
                };
                return (
                  <div
                    className={`rounded-3xl p-5 border text-left flex flex-col justify-between gap-3 transition-all duration-300 ${
                      isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/70 border-slate-200"
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] font-mono text-slate-405 uppercase tracking-widest font-bold mb-1">
                        Top Emission Source
                      </span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400">Largest lifestyle parameter trigger</p>
                    </div>

                    <div className="flex items-center gap-3 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-rose-500 bg-rose-500/10">
                        {maxCat === "transport" && <Bike className="w-4 h-4" />}
                        {maxCat === "electricity" && <Zap className="w-4 h-4" />}
                        {maxCat === "food" && <Flame className="w-4 h-4" />}
                        {maxCat === "shopping" && <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate">
                          {catLabels[maxCat as keyof typeof catLabels]}
                        </h4>
                        <span className="block text-[10px] font-mono text-rose-500 font-bold mt-0.5">
                          {Math.round(maxVal)} kg CO2e logged
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-405 dark:text-slate-400">
                      Keep logging actions to adjust weight ratios
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* RECENT ACTIVITIES TICKER SNEAK PEEK */}
            <div
              className={`rounded-3xl p-6 border text-left transition-all duration-300 ${
                isDark ? "bg-slate-900/40 border-slate-800" : "bg-white/75 border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                    Recent Logs Sneak Peek
                  </h4>
                  <p className="text-xs text-slate-400">Latest environmental initiative entries mapped</p>
                </div>
                <button
                  onClick={() => setActiveTab("logger")}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-450 flex items-center gap-1 cursor-pointer"
                >
                  Manage Full Logs <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activities.length === 0 ? (
                  <p className="col-span-3 text-xs italic text-slate-400 text-center py-4">No activities logged yet.</p>
                ) : (
                  activities.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-2xl border border-slate-800/10 dark:border-slate-800 bg-slate-950/20 dark:bg-slate-900/15 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] ${
                          a.category === "transport" ? "bg-emerald-500/10 text-emerald-400" :
                          a.category === "electricity" ? "bg-cyan-500/10 text-cyan-400" :
                          a.category === "food" ? "bg-amber-500/10 text-amber-400" : "bg-pink-500/10 text-pink-400"
                        }`}>
                          {a.category === "transport" && <Bike className="w-3.5 h-3.5" />}
                          {a.category === "electricity" && <Zap className="w-3.5 h-3.5" />}
                          {a.category === "food" && <Flame className="w-3.5 h-3.5" />}
                          {a.category === "shopping" && <ShoppingBag className="w-3.5 h-3.5" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{a.label}</p>
                          <span className="block text-[8px] text-slate-400 font-mono mt-0.5">
                            {new Date(a.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-rose-500 shrink-0">
                        +{Math.round(a.carbonAmount)} kg
                      </span>
                    </div>
                  ))
                )}
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

        {/* GOALS & MILESTONES (GOAL MANAGER) */}
        {(activeTab === "milestones" || activeTab === "goals") && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-7">
              {/* Goal Manager Component (Span 8) */}
              <div className="xl:col-span-8">
                <GoalManager
                  goals={goals}
                  activities={activities}
                  onSaveGoal={handleSaveGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onAddNotification={(text) => {
                    setNotifications((prev) => [
                      { id: `not-goal-${Date.now()}`, text, time: "Just now", read: false },
                      ...prev
                    ]);
                  }}
                  isDark={isDark}
                />
              </div>

              {/* Honors Badges Panel (Span 4) */}
              <div className="xl:col-span-4">
                <section className="rounded-3xl p-6 border backdrop-blur-md transition-all duration-300 dark:bg-slate-900/35 dark:border-slate-800 bg-white border-slate-200">
                  <div className="text-left mb-5">
                    <h3 className="text-xs font-black font-display text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                      Eco Honors & Awards
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-normal">Complete targeted challenges to unlock unique shields</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    {badges.map((b) => {
                      const isLocked = b.unlockedAt === null;
                      return (
                        <div
                          key={b.id}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 cursor-help group relative transition-all duration-200 ${
                            isLocked
                              ? "bg-slate-950/20 border-slate-850/15 opacity-40 hover:opacity-75"
                              : `${b.colorClass} scale-100 hover:scale-[1.03] shadow-sm`
                          }`}
                        >
                          <div className="w-8.5 h-8.5 rounded-full flex items-center justify-center bg-slate-950/20 border border-slate-800/40 shadow-inner">
                            {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Award className="w-5 h-5 text-emerald-400" />}
                          </div>
                          <span className="text-[10px] uppercase font-display font-black leading-snug truncate w-full text-slate-800 dark:text-slate-300">
                            {b.title}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-slate-400">
                            {isLocked ? "Locked" : "Active Winner"}
                          </span>

                          {/* Interactive Hover Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-3 text-[9px] leading-relaxed bg-slate-950 text-slate-200 rounded-xl shadow-2xl border border-slate-855 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-205 z-50">
                            <span className="block font-black text-emerald-405 mb-0.5 uppercase tracking-wide">{b.title}</span>
                            {b.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-200/20 dark:border-slate-800 text-[10px] text-slate-450 text-center italic font-mono">
                    * Unlocking badges triggers immediate rank level increases.
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* AI-POWERED DOCUMENT ANALYSIS */}
        {activeTab === "ecoscan" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <EcoScan
              onLogActivity={handleAddActivity}
              isDark={isDark}
            />
          </div>
        )}

        {/* LEAGUE HUB & GAMIFICATION SUITE */}
        {activeTab === "community" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <QuestGamification
              userXP={xp}
              userGreenPoints={greenPoints}
              streakCount={streak}
              lastStreakCheckIn={lastStreakCheckIn}
              badges={badges}
              activities={activities}
              onUpdateXPAndPoints={handleUpdateXPAndPoints}
              onCheckInDaily={handleCheckInDaily}
              isDark={isDark}
            />
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
