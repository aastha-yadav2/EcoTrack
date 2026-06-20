import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  Zap,
  Flame,
  Search,
  Calendar,
  Sparkles,
  Trophy,
  Share2,
  Users,
  Compass,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  Gift,
  AlertCircle,
  ArrowUpRight,
  User,
  Heart,
  Bike,
  Leaf,
  ShoppingBag,
  Cpu
} from "lucide-react";
import { Badge, Activity } from "../types";
import { EcoTrackAPI } from "../services/api";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: "transport" | "food" | "electricity" | "shopping" | "general";
  reqCount: number;
  xpReward: number;
  gpReward: number;
}

interface QuestGamificationProps {
  userXP: number;
  userGreenPoints: number;
  streakCount: number;
  lastStreakCheckIn: string;
  badges: Badge[];
  activities: Activity[];
  onUpdateXPAndPoints: (xpGain: number, gpGain: number, unlockedBadgeId?: string) => Promise<void>;
  onCheckInDaily: () => Promise<void>;
  isDark: boolean;
}

// Curated active weekly challenges
const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "chall-1",
    title: "Low Carbon Cruiser",
    description: "Join transit, cycle, or walk to accumulate lower footprint travels.",
    category: "transport",
    reqCount: 3,
    xpReward: 150,
    gpReward: 50
  },
  {
    id: "chall-2",
    title: "Eco Gourmet",
    description: "Submit 4 plant-based vegan or vegetarian dinners to optimize food metrics.",
    category: "food",
    reqCount: 4,
    xpReward: 200,
    gpReward: 70
  },
  {
    id: "chall-3",
    title: "Standby Exterminator",
    description: "Submit a smart appliance check-in or reduce utility counts.",
    category: "electricity",
    reqCount: 1,
    xpReward: 100,
    gpReward: 40
  },
  {
    id: "chall-4",
    title: "Wardrobe Fast",
    description: "Purchase only local organic groceries or log no fast apparel.",
    category: "shopping",
    reqCount: 2,
    xpReward: 120,
    gpReward: 55
  }
];

export const QuestGamification: React.FC<QuestGamificationProps> = ({
  userXP,
  userGreenPoints,
  streakCount,
  lastStreakCheckIn,
  badges,
  activities,
  onUpdateXPAndPoints,
  onCheckInDaily,
  isDark
}) => {
  // Level definitions (100 XP per level)
  const userLevel = Math.floor(userXP / 100) + 1;
  const nextLevelXP = 100;
  const currentXPProgress = userXP % 100;

  // Local Leaderboard state populated with virtual high quality eco advocates
  const initialCompetitors = [
    { name: "Sophia Lin", xp: 480, level: 5, greenPoints: 1200, badges: 3, isUser: false, avatar: "SL" },
    { name: "Marcus Green", xp: 390, level: 4, greenPoints: 950, badges: 2, isUser: false, avatar: "MG" },
    { name: "Eva Vance", xp: 260, level: 3, greenPoints: 680, badges: 2, isUser: false, avatar: "EV" },
    { name: "Kenji Sato", xp: 140, level: 2, greenPoints: 480, badges: 1, isUser: false, avatar: "KS" },
    { name: "Sarah Connor", xp: 90, level: 1, greenPoints: 320, badges: 1, isUser: false, avatar: "SC" }
  ];

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"quests" | "leaderboard" | "achievements">("quests");

  // Streak verification
  const todayStr = new Date().toISOString().split("T")[0];
  const isCheckedInToday = lastStreakCheckIn === todayStr;

  // New badge unlocked overlays
  const [unlockedBadgeOverlay, setUnlockedBadgeOverlay] = useState<Badge | null>(null);
  const [unlockedAiMessage, setUnlockedAiMessage] = useState<string>("");
  const [overlayLoading, setOverlayLoading] = useState(false);

  // Daily Check in action
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Sort and set leaderboard including Yadav Aastha in the mix
  useEffect(() => {
    const list = [
      ...initialCompetitors,
      {
        name: "Yadav Aastha (You)",
        xp: userXP,
        level: userLevel,
        greenPoints: userGreenPoints,
        badges: badges.filter(b => b.unlockedAt !== null).length,
        isUser: true,
        avatar: "YA"
      }
    ];
    list.sort((a, b) => b.xp - a.xp);
    setLeaderboard(list);
  }, [userXP, userGreenPoints, badges, userLevel]);

  // Challenge progress assessor
  const getChallengeProgress = (challenge: Challenge) => {
    let currentCount = 0;
    if (challenge.category === "transport") {
      // count of bike/walk, EV, transit activities
      currentCount = activities.filter(
        (a) =>
          a.category === "transport" &&
          (a.label.toLowerCase().includes("transit") ||
            a.label.toLowerCase().includes("bike") ||
            a.label.toLowerCase().includes("train") ||
            a.label.toLowerCase().includes("walk") ||
            a.label.toLowerCase().includes("ev") ||
            a.label.toLowerCase().includes("scooter"))
      ).length;
    } else if (challenge.category === "food") {
      // count of vegetarian/vegan food logs
      currentCount = activities.filter(
        (a) =>
          a.category === "food" &&
          (a.label.toLowerCase().includes("vegan") ||
            a.label.toLowerCase().includes("vegetarian") ||
            a.label.toLowerCase().includes("buddha") ||
            a.label.toLowerCase().includes("plant"))
      ).length;
    } else if (challenge.category === "electricity") {
      // count of any electricity audits, utility cycles
      currentCount = activities.filter((a) => a.category === "electricity").length;
    } else if (challenge.category === "shopping") {
      // count of groceries or local acquisitions
      currentCount = activities.filter((a) => a.category === "shopping").length;
    }

    const percentage = Math.min(100, Math.round((currentCount / challenge.reqCount) * 100));
    return {
      current: currentCount,
      percent: percentage,
      isFinished: currentCount >= challenge.reqCount
    };
  };

  // Check In Daily trigger
  const handleCheckInClicked = async () => {
    if (isCheckedInToday || isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      await onCheckInDaily();
      // Gain $+25 XP$ and $+10 Green Points$ instantly
      await onUpdateXPAndPoints(25, 10);
      
      // Request motivating check-in quote
      const data = await EcoTrackAPI.getGamificationEncouragement({
        achievementType: "Daily Check-in Streak",
        achievementName: `${streakCount + 1}-Day Eco Streak Active`,
        userLevel: userLevel,
        streakCount: streakCount + 1
      });
      
      setUnlockedBadgeOverlay({
        id: "streak-congratulations",
        title: "Streak Reinforcement Claimed",
        description: `Your ${streakCount + 1} days eco-mindfulness streak has been logged on the global network. You earned local bonus XP.`,
        unlockedAt: new Date().toISOString(),
        iconName: "Flame",
        colorClass: "bg-orange-500/10 text-orange-500 border-orange-500/20"
      });
      setUnlockedAiMessage(data.message || `Sensational check-in! Logging continuous standby and travel audits raises your global standing.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Complete a challenge
  const handleClaimChallengeReward = async (chall: Challenge) => {
    // Grant rewards
    await onUpdateXPAndPoints(chall.xpReward, chall.gpReward);

    // Formulate a beautiful celebration AI message
    setOverlayLoading(true);
    setUnlockedBadgeOverlay({
      id: chall.id,
      title: `${chall.title} Challenge Completed!`,
      description: `Target of ${chall.reqCount} logs completed. Claimed +${chall.xpReward} XP and +${chall.gpReward} GP.`,
      unlockedAt: new Date().toISOString(),
      iconName: "CheckCircle",
      colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    });

    try {
      const resData = await EcoTrackAPI.getGamificationEncouragement({
        achievementType: "Weekly Challenge Finished",
        achievementName: chall.title,
        userLevel: userLevel,
        streakCount: streakCount
      });
      setUnlockedAiMessage(resData.message || `Outstanding persistence! Finishing ${chall.title} solidifies your local carbon transition plan.`);
    } catch (err) {
      setUnlockedAiMessage(`Spectacular effort! Saving carbon across multiple sectors directly moves your global ranking high.`);
    } finally {
      setOverlayLoading(false);
    }
  };

  // Force click badge to review stats or trigger unlocking for interactive fun
  const handleBadgeInteraction = async (badge: Badge) => {
    if (badge.unlockedAt) {
      // Show celebrating feedback
      setOverlayLoading(true);
      setUnlockedBadgeOverlay(badge);
      try {
        const resData = await EcoTrackAPI.getGamificationEncouragement({
          achievementType: "Badge Recognition",
          achievementName: badge.title,
          userLevel: userLevel,
          streakCount: streakCount
        });
        setUnlockedAiMessage(resData.message || badge.description);
      } catch (err) {
        setUnlockedAiMessage(badge.description);
      } finally {
        setOverlayLoading(false);
      }
    } else {
      // Interactive badge unlocking! If they have appropriate logs, let them trigger unlock!
      let canUnlock = false;
      if (badge.id === "badge-3") {
        // Power Miser: 2 electricity logs completed
        const electricityCount = activities.filter(a => a.category === "electricity").length;
        if (electricityCount >= 2) canUnlock = true;
      } else if (badge.id === "badge-4") {
        // Conscious Wardrobe: 2 shopping logs completed
        const shoppingCount = activities.filter(a => a.category === "shopping").length;
        if (shoppingCount >= 2) canUnlock = true;
      }

      if (canUnlock) {
        setOverlayLoading(true);
        // Sync badge unlock to App level
        await onUpdateXPAndPoints(100, 30, badge.id);
        
        const unlockedBadgeObj = { ...badge, unlockedAt: new Date().toISOString() };
        setUnlockedBadgeOverlay(unlockedBadgeObj);

        try {
          const resData = await EcoTrackAPI.getGamificationEncouragement({
            achievementType: "Dynamic Badge Unlocked",
            achievementName: badge.title,
            userLevel: userLevel,
            streakCount: streakCount
          });
          setUnlockedAiMessage(resData.message || `Spectacular carbon sensitivity! Unlocking the "${badge.title}" badge confirms your climate commitments.`);
        } catch (err) {
          setUnlockedAiMessage(badge.description);
        } finally {
          setOverlayLoading(false);
        }
      } else {
        // Warn they do more logs
        const tips = {
          "badge-3": "Audit home appliances and submit at least 2 electricity logs under the 'Logs' tab to unlock this shield.",
          "badge-4": "Log at least 2 carbon-efficient shopping activities under the 'Logs' tab to unlock."
        };
        alert(tips[badge.id as "badge-3" | "badge-4"] || "Complete goals or log activities to claim this badge!");
      }
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case "Bike": return <Bike className="w-5 h-5" />;
      case "Leaf": return <Leaf className="w-5 h-5" />;
      case "Zap": return <Zap className="w-5 h-5" />;
      case "ShoppingBag": return <ShoppingBag className="w-5 h-5" />;
      case "Flame": return <Flame className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  // Filter leaderboard
  const filteredLeaderboard = leaderboard.filter((comp) =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: MAIN METRIC GLASS PANEL (XP, LEVEL, GREEN POINTS, STREAK CHECK-IN) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* LEVEL CARD AND XP TRACTION PROGRESS (Span 7) */}
        <div className={`md:col-span-7 p-6 rounded-3xl border text-left relative overflow-hidden transition-all duration-300 ${
          isDark 
            ? "bg-slate-900/40 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950" 
            : "bg-emerald-50/5 border-slate-200 shadow-sm bg-gradient-to-br from-white via-emerald-500/5 to-white"
        }`}>
          {/* Subtle decoration vector */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none animate-pulse" />

          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono tracking-widest uppercase text-emerald-500 font-extrabold flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Planetary Ranking Division
              </span>
              <h2 className="text-xl font-black font-display text-slate-850 dark:text-white uppercase tracking-wider">
                Yadav Aastha
              </h2>
            </div>
            
            <div className={`p-2 px-3 rounded-2xl flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10`}>
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black font-mono text-emerald-500">LEVEL {userLevel}</span>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <div className="flex justify-between items-end text-xs font-semibold">
              <span className="text-slate-400 dark:text-slate-400 text-[10.5px]">Abatement XP multiplier tracking</span>
              <span className="font-mono text-slate-800 dark:text-white font-black">{currentXPProgress} / {nextLevelXP} XP</span>
            </div>

            {/* Simulated Animated Bar */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-full overflow-hidden p-0.5 relative">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 via-[#06b6d4] to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${currentXPProgress}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Next Threshold: Level {userLevel + 1}</span>
              <span>Total Points: <b>{userGreenPoints}</b> GP</span>
            </div>
          </div>
          
          {/* Quick Green Points details */}
          <div className="mt-5 pt-4 border-t border-slate-200/10 dark:border-slate-800/60 flex items-center gap-4 text-left">
            <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/10 px-3.5 py-2 rounded-2xl">
              <Gift className="w-4.5 h-4.5 text-teal-400" />
              <div>
                <span className="block text-[8px] font-mono text-slate-400 uppercase font-black tracking-wide leading-none">Green Points Balance</span>
                <span className="text-xs font-black font-mono text-teal-500 leading-snug">{userGreenPoints} GP</span>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400 max-w-xs">
              Spend GP on upcoming virtual tree plantations or claim honorary badges in the collection ledger.
            </p>
          </div>
        </div>

        {/* INTERACTIVE STREAK CHECK-IN CARD (Span 5) */}
        <div className={`md:col-span-5 p-6 rounded-3xl border text-left flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
          isDark 
            ? "bg-slate-900/40 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950" 
            : "bg-orange-50/5 border-orange-200 shadow-sm bg-gradient-to-br from-white to-orange-500/5"
        }`}>
          <div className="space-y-1.5 relative z-10">
            <span className="text-[9px] font-mono tracking-widest uppercase text-orange-500 font-extrabold flex items-center gap-1 animate-pulse">
              <Flame className="w-4 h-4 text-orange-400" /> Active Daily Habit Streak
            </span>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black font-display dark:text-slate-200 text-slate-800 uppercase tracking-wide">
                Streak Ledger Tracker
              </h3>
              <span className="font-mono text-xl font-black text-orange-500 bg-orange-500/10 border border-orange-500/10 px-2.5 py-0.5 rounded-xl">
                {streakCount} Days
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Verify your carbon logging habits daily. Check in once per 24 hours to gain multiplier bonuses.
            </p>
          </div>

          <div className="mt-5 relative z-10">
            {isCheckedInToday ? (
              <div className="w-full text-center py-3.5 border border-emerald-500/20 bg-emerald-500/10 rounded-2xl flex items-center justify-center gap-1.5 text-xs text-emerald-500 font-bold uppercase font-mono shadow-inner">
                <CheckCircle className="w-4.5 h-4.5" /> Checked-In Today
              </div>
            ) : (
              <motion.button
                onClick={handleCheckInClicked}
                whileTap={{ scale: 0.96 }}
                disabled={isCheckingIn}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-mono text-xs font-black rounded-2xl cursor-pointer shadow-lg uppercase transition-all duration-200 outline-none border-none flex items-center justify-center gap-1.5"
              >
                {isCheckingIn ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Flame className="w-4.5 h-4.5 text-white" /> Check-In Daily (+25 XP)
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>

      </div>

      {/* TABS NAVIGATION BAR FOR THE INTERACTIVE GAMIFICATION HUB */}
      <div className="flex border-b border-zinc-200/10 dark:border-slate-800/60 pb-1.5 gap-5">
        {[
          { id: "quests", label: "Quests & Challenges", count: WEEKLY_CHALLENGES.length },
          { id: "leaderboard", label: "Neighborhood League", count: null },
          { id: "achievements", label: "Honor Badges Room", count: badges.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer outline-none ${
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-505 dark:text-emerald-400"
                : "text-slate-400 hover:text-slate-350 border-transparent"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className="text-[9px] px-1.5 py-0.2 bg-zinc-200/40 dark:bg-slate-800 text-zinc-400 rounded-full font-mono font-black">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* DYNAMIC HUB DRAWERS */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: WEEKLY CHALLENGES (ACTIVE QUESTS) */}
        {activeTab === "quests" && (
          <motion.div
            key="quests-pane"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left"
          >
            {WEEKLY_CHALLENGES.map((chall) => {
              const status = getChallengeProgress(chall);
              return (
                <div
                  key={chall.id}
                  className={`p-5 rounded-3xl border relative overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                    isDark 
                      ? "bg-slate-900/40 border-slate-850 hover:border-slate-800 bg-gradient-to-b from-slate-900/20 to-slate-950/20" 
                      : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-black uppercase ${
                        chall.category === "transport" ? "bg-emerald-500/10 text-emerald-400" :
                        chall.category === "food" ? "bg-amber-500/10 text-amber-400" :
                        chall.category === "electricity" ? "bg-cyan-400/10 text-cyan-400" : "bg-pink-500/10 text-pink-400"
                      }`}>
                        {chall.category} Sector
                      </span>
                      
                      <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-400 uppercase">
                        <span>XP +{chall.xpReward}</span>
                        <span>•</span>
                        <span>GP +{chall.gpReward}</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-slate-850 dark:text-white leading-tight">
                      {chall.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {chall.description}
                    </p>
                  </div>

                  {/* CHALLENGE PROGRESS BAR SET */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-450 uppercase">
                      <span>Progress Rate</span>
                      <span>{status.current} / {chall.reqCount} logs matching</span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800/80 rounded-full overflow-hidden p-[1px]">
                      <motion.div
                        className={`h-full rounded-full ${
                          status.isFinished ? "bg-emerald-500" : "bg-emerald-400"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${status.percent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <div className="pt-2">
                      {status.isFinished ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleClaimChallengeReward(chall)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 dark:text-white font-mono text-[10px] font-black rounded-xl cursor-pointer uppercase shadow border-none outline-none flex items-center justify-center gap-1"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Claim Challenge Prize
                        </motion.button>
                      ) : (
                        <div className="w-full text-center py-2 bg-slate-100 dark:bg-slate-950/40 text-slate-405 dark:text-slate-500 font-mono text-[9.5px] font-bold tracking-wide rounded-xl border border-slate-200/10">
                          LOG MORE IN THE 'LOGS' TAB TO PROGRESS
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* TAB 2: NEIGHBORHOOD LEAGUE LEADERBOARD */}
        {activeTab === "leaderboard" && (
          <motion.div
            key="leaderboard-pane"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={`p-5 rounded-3xl border text-left space-y-4 ${
              isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-3 border-b border-slate-200/10 dark:border-slate-800/60">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase font-black text-emerald-400">Neighborhood League Registry</span>
                <h3 className="text-sm font-black font-display uppercase tracking-wider dark:text-white text-slate-800">
                  Carbon Free Climbers Division
                </h3>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter competitors..."
                  className={`pl-8 pr-4 py-2 rounded-xl text-[11px] font-semibold bg-transparent border focus:outline-none w-52 ${
                    isDark ? "border-slate-800 text-white bg-slate-950/60" : "border-slate-200 text-slate-800 bg-slate-50/60"
                  }`}
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-450" />
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/10 dark:border-slate-800/40 text-[10px] font-mono text-slate-400 uppercase font-black">
                    <th className="py-2.5 px-3 w-16">Rank</th>
                    <th className="py-2.5 px-3">Climber</th>
                    <th className="py-2.5 px-3">Level Rank</th>
                    <th className="py-2.5 px-3 font-mono">Abatement XP</th>
                    <th className="py-2.5 px-3 font-mono">Green Points</th>
                    <th className="py-2.5 px-3">Certificates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/10 dark:divide-slate-800/40">
                  {filteredLeaderboard.map((comp, idx) => (
                    <motion.tr
                      key={comp.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`transition-colors font-medium ${
                        comp.isUser 
                          ? isDark 
                            ? "bg-emerald-500/10 text-white" 
                            : "bg-emerald-500/10 text-slate-900 border-none rounded-xl"
                          : ""
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3 px-3">
                        <span className={`w-6 h-6 rounded-lg font-mono font-black text-[10px] flex items-center justify-center ${
                          idx === 0 ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20" :
                          idx === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400/20" :
                          idx === 2 ? "bg-amber-600/20 text-amber-600 border border-amber-600/20" :
                          "bg-slate-200/10 dark:bg-slate-800/40 text-slate-450"
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Name Card */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7.5 h-7.5 rounded-full font-bold font-mono text-[10px] flex items-center justify-center shrink-0 text-slate-950 ${
                            comp.isUser ? "bg-emerald-400 flex items-center justify-center" : "bg-emerald-500/20 dark:text-emerald-400 text-emerald-600"
                          }`}>
                            {comp.avatar}
                          </span>
                          <span className={`${comp.isUser ? "font-black" : "font-semibold"} dark:text-slate-100 text-slate-800 truncate`}>
                            {comp.name}
                          </span>
                        </div>
                      </td>

                      {/* Rank Indicator */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase bg-slate-950/10 dark:bg-slate-950/20 px-2 py-0.5 rounded-md inline-block">
                          Lv.{comp.level} Guardian
                        </span>
                      </td>

                      {/* XP Column */}
                      <td className="py-3 px-3 font-mono font-bold dark:text-emerald-400 text-emerald-600 text-xs">
                        {comp.xp} XP
                      </td>

                      {/* GP Column */}
                      <td className="py-3 px-3 font-mono font-bold dark:text-teal-400 text-teal-600">
                        {comp.greenPoints} GP
                      </td>

                      {/* Badges Column */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded">
                          {comp.badges} Claims
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 3: ACHIEVEMENT BADGES DRAWER */}
        {activeTab === "achievements" && (
          <motion.div
            key="achievements-pane"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={`p-6 rounded-3xl border text-left space-y-5 ${
              isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono uppercase font-black text-emerald-400">Claims Center & Awards Panel</span>
              <h3 className="text-sm font-black font-display uppercase tracking-wider dark:text-white text-slate-800">
                Carbon Reducer Badges & Certifications
              </h3>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Unlocking certificates awards persistent GP and XP boosts instantly on the ledger. Select any icon to review stats, audit progress or claim unlocked state!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200/10 dark:border-slate-800/60">
              {badges.map((b) => {
                const isLocked = b.unlockedAt === null;
                return (
                  <motion.div
                    key={b.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBadgeInteraction(b)}
                    className={`p-4 rounded-3xl border flex flex-col justify-between text-left cursor-pointer transition-all relative overflow-hidden group ${
                      isLocked
                        ? "bg-slate-950/20 border-slate-850/10 opacity-55 hover:opacity-100"
                        : `${b.colorClass} border-solid`
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-950/20 border border-slate-850/40 shadow-inner">
                          {getBadgeIcon(b.iconName)}
                        </div>

                        {/* Complete rating stamp */}
                        <span className={`text-[8px] font-mono uppercase font-black px-1.5 py-0.5 rounded ${
                          isLocked ? "bg-slate-800/40 text-slate-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {isLocked ? "Locked" : "Claimed"}
                        </span>
                      </div>

                      <h4 className="text-xs font-black font-display leading-tight dark:text-white text-slate-850 group-hover:underline">
                        {b.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {b.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/15 dark:border-slate-800/40 text-[9px] font-mono leading-none text-slate-450 uppercase flex justify-between items-center">
                      <span>Threshold check-in</span>
                      <span className="font-bold">
                        {isLocked ? "Audit Logs" : "UNLOCKED!"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* DETAILED INTERACTIVE OVERLAY MODAL FOR UNLOCKS AND MOTIVATIONAL AI RESPONSE */}
      <AnimatePresence>
        {unlockedBadgeOverlay && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl border p-6 text-center relative shadow-2xl ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              {/* Confetti particles simulations */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40 overflow-hidden">
                <div className="absolute -top-10 left-1/4 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                <div className="absolute -top-10 left-1/2 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div className="absolute -top-10 left-3/4 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>

              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 mb-4 shadow">
                <Trophy className="w-8 h-8 text-emerald-400 animate-bounce" />
              </div>

              <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-black">Environmental Achievement Logged</span>
              <h3 className="text-base font-black font-display uppercase tracking-wide mt-1.5">
                {unlockedBadgeOverlay.title}
              </h3>
              
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto mt-2 italic">
                "{unlockedBadgeOverlay.description}"
              </p>

              {/* MOTIVATIONAL AI SECTION */}
              <div className="mt-5 space-y-2.5">
                <span className="text-[8.5px] uppercase font-mono font-black text-slate-450 leading-none block">TAILORED AI MITIGATION FEEDBACK</span>
                
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed text-left relative overflow-hidden ${
                  isDark ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-705"
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  
                  {overlayLoading ? (
                    <div className="py-4 text-center space-y-1.5">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[9px] text-slate-450 italic font-mono animate-pulse">Running active audit in advisor node...</p>
                    </div>
                  ) : unlockedAiMessage ? (
                    <p className="font-medium">{unlockedAiMessage}</p>
                  ) : (
                    <p className="font-medium">Sensational efforts Yadav! Every single vegan log and train trip reduces community targets immediately. You are on prime trajectory to claim Legend rank!</p>
                  )}
                </div>
              </div>

              {/* OK trigger */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setUnlockedBadgeOverlay(null);
                    setUnlockedAiMessage("");
                  }}
                  className="w-full py-3 bg-[#0c3e2e] dark:bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black rounded-xl cursor-pointer border-none outline-none shadow uppercase transition-all"
                >
                  Confirm Ledger Record
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
