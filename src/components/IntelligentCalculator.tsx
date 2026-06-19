import React, { useState, useEffect, useRef } from "react";
import {
  Leaf,
  Footprints,
  Zap,
  ShoppingBag,
  Sparkles,
  Award,
  Trash2,
  Lock,
  ChevronRight,
  Calculator,
  Compass,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  Coins,
  Utensils,
  Check,
  TrendingDown
} from "lucide-react";
import { SavedCalculation } from "../types";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { User as FirebaseUser } from "firebase/auth";

// Emission factors configuration (kg CO2e)
const EMISSION_FACTORS = {
  vehicle: {
    electric: 0.05, // kg CO2e per km
    petrol: 0.18,
    diesel: 0.20,
    hybrid: 0.09,
    motorcycle: 0.10,
    public: 0.04,
    none: 0.0
  },
  electricity: 0.45, // kg CO2e per kWh
  water: 0.0003, // kg CO2e per liter
  food: {
    vegan: 1.2, // kg CO2e per day
    vegetarian: 2.0,
    pescatarian: 2.8,
    moderate: 4.5,
    heavy_beef: 7.5
  },
  shopping: {
    rare: 0.5, // kg CO2e per day
    average: 2.0,
    frequent: 5.0,
    super: 10.0
  }
};

interface IntelligentCalculatorProps {
  user: FirebaseUser | null;
  isDark: boolean;
  onOpenSignIn: () => void;
}

export const IntelligentCalculator: React.FC<IntelligentCalculatorProps> = ({
  user,
  isDark,
  onOpenSignIn
}) => {
  // Input fields state
  const [transportDistance, setTransportDistance] = useState<number>(15);
  const [vehicleType, setVehicleType] = useState<keyof typeof EMISSION_FACTORS.vehicle>("petrol");
  const [electricityUsage, setElectricityUsage] = useState<number>(180); // kWh per month
  const [waterUsage, setWaterUsage] = useState<number>(120); // Liters per day
  const [foodHabit, setFoodHabit] = useState<keyof typeof EMISSION_FACTORS.food>("moderate");
  const [shoppingFrequency, setShoppingFrequency] = useState<keyof typeof EMISSION_FACTORS.shopping>("average");

  // Confidence Checklist attributes
  const [checkedOdometer, setCheckedOdometer] = useState<boolean>(false);
  const [checkedElectricBill, setCheckedElectricBill] = useState<boolean>(false);
  const [checkedWaterBill, setCheckedWaterBill] = useState<boolean>(false);
  const [checkedFoodLogs, setCheckedFoodLogs] = useState<boolean>(false);

  // Saved calculations records
  const [savedRecords, setSavedRecords] = useState<SavedCalculation[]>([]);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Active chart tooltip / selection
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [compareHoverIndex, setCompareHoverIndex] = useState<number | null>(null);

  // Recommendations interactive state
  const [activeCalcSubTab, setActiveCalcSubTab] = useState<"calculator" | "recommendations">("calculator");
  const [committedIds, setCommittedIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("ecotrack-committed-actions");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("ecotrack-completed-actions");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("ecotrack-committed-actions", JSON.stringify(committedIds));
  }, [committedIds]);

  useEffect(() => {
    localStorage.setItem("ecotrack-completed-actions", JSON.stringify(completedIds));
  }, [completedIds]);

  // Resize observer state for SVG charts
  const [svgWidth, setSvgWidth] = useState<number>(380);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(Math.max(280, entry.contentRect.width));
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate emissions in real-time
  const transportDailyEmissions = transportDistance * EMISSION_FACTORS.vehicle[vehicleType];
  const electricityDailyEmissions = (electricityUsage * EMISSION_FACTORS.electricity) / 30.4;
  const waterDailyEmissions = waterUsage * EMISSION_FACTORS.water;
  const foodDailyEmissions = EMISSION_FACTORS.food[foodHabit];
  const shoppingDailyEmissions = EMISSION_FACTORS.shopping[shoppingFrequency];

  const emissionsDaily = transportDailyEmissions + electricityDailyEmissions + waterDailyEmissions + foodDailyEmissions + shoppingDailyEmissions;
  const emissionsMonthly = emissionsDaily * 30.4;
  const emissionsAnnual = emissionsDaily * 365;

  // Sustainability Expert Personalized Recommendations Algorithm
  const expertRecommendations = React.useMemo(() => {
    // 1. COMMUTE RECOMMENDATION
    const commuteRec = (() => {
      if (transportDistance === 0 || vehicleType === 'none') {
        return {
          id: "rec_transport",
          category: "Transport Offset",
          icon: Footprints,
          color: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          glowColor: "shadow-emerald-500/5",
          title: "Advocate for Safe Bi-Bike Lines 🚲",
          description: `Since you maintain a walk or bike routine, your daily carbon commuting footprint is a flawless zero! Magnify that baseline by supporting neighborhood green streets.`,
          difficulty: "Easy" as const,
          co2Reduction: "8.5 kg / month",
          co2Val: 8.5,
          moneySavings: "$0 (Priceless)",
          moneyVal: 0,
          timeRequired: "1 hr / week",
          practicalHint: "Hint: Support urban redesign forums and local cycling advocacy groups online."
        };
      }
      
      const isHeavy = vehicleType === 'petrol' || vehicleType === 'diesel';
      const reductionCo2 = (transportDailyEmissions * 0.45 * 30.4).toFixed(1);
      const savingsVal = Math.round(transportDistance * 0.16 * 4 * 4); // 4 days/week * 4 weeks
      
      if (isHeavy) {
        return {
          id: "rec_transport",
          category: "Transport Offset",
          icon: Footprints,
          color: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          glowColor: "shadow-emerald-500/5",
          title: "Instate a Co-active Transit Day 🚌",
          description: `Switch your high-emission ${vehicleType} commuting run for rapid trains, subways, or vehicle carpooling just two days every week.`,
          difficulty: "Medium" as const,
          co2Reduction: `${reductionCo2} kg / month`,
          co2Val: parseFloat(reductionCo2),
          moneySavings: `$${savingsVal} / month`,
          moneyVal: savingsVal,
          timeRequired: "15 min / day",
          practicalHint: `Hint: Planning your morning departure coordinates directly with local metro applications.`
        };
      } else {
        return {
          id: "rec_transport",
          category: "Transport Offset",
          icon: Footprints,
          color: "text-emerald-500",
          iconBg: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          glowColor: "shadow-emerald-500/5",
          title: "Optimize Maps Eco-Muting 🗺️",
          description: `Leverage routing parameters on your active travel coordinates. Keeping speeds consistent minimizes intense kinetic breaking.`,
          difficulty: "Easy" as const,
          co2Reduction: `${(transportDailyEmissions * 0.15 * 30.4).toFixed(1)} kg / month`,
          co2Val: parseFloat((transportDailyEmissions * 0.15 * 30.4).toFixed(1)),
          moneySavings: `$${Math.round(savingsVal * 0.2)} / month`,
          moneyVal: Math.round(savingsVal * 0.2),
          timeRequired: "Instant",
          practicalHint: "Hint: Turn on 'Prefer lowest carbon pathway' options in Google Maps preferences panel."
        };
      }
    })();

    // 2. ELECTRICITY RECOMMENDATION
    const electricRec = (() => {
      const isHigh = electricityUsage > 220;
      const co2Red = (electricityUsage * 0.15 * EMISSION_FACTORS.electricity).toFixed(1);
      const cashSav = Math.round(electricityUsage * 0.15 * 0.18);

      if (isHigh) {
        return {
          id: "rec_electricity",
          category: "Utility Grid",
          icon: Zap,
          color: "text-cyan-400",
          iconBg: "bg-cyan-400/10",
          borderColor: "border-cyan-400/20",
          glowColor: "shadow-cyan-400/5",
          title: "Prune Standby Phantom Plug Loads 🔌",
          description: `Your monthly power draw of ${electricityUsage} kWh has active idle device loads. Plug setups into clever smart outlet strips.`,
          difficulty: "Easy" as const,
          co2Reduction: `${co2Red} kg / month`,
          co2Val: parseFloat(co2Red),
          moneySavings: `$${cashSav} / month`,
          moneyVal: cashSav,
          timeRequired: "20 min / once",
          practicalHint: "Hint: Unplugging chargers and systems when traveling chops passive electric drag by up to 12%."
        };
      } else {
        return {
          id: "rec_electricity",
          category: "Utility Grid",
          icon: Zap,
          color: "text-cyan-400",
          iconBg: "bg-cyan-400/10",
          borderColor: "border-cyan-400/20",
          glowColor: "shadow-cyan-400/5",
          title: "Calibrate Clever Thermostat Offsets 🌡️",
          description: "Stabilize home temperature limits between 19-21°C during hot or cold weather states. Each degree saved limits HVAC cycles by 7%.",
          difficulty: "Easy" as const,
          co2Reduction: `${(electricityUsage * 0.08 * EMISSION_FACTORS.electricity).toFixed(1)} kg / month`,
          co2Val: parseFloat((electricityUsage * 0.08 * EMISSION_FACTORS.electricity).toFixed(1)),
          moneySavings: `$${Math.round(electricityUsage * 0.08 * 0.18)} / month`,
          moneyVal: Math.round(electricityUsage * 0.08 * 0.18),
          timeRequired: "5 mins",
          practicalHint: "Hint: Set automatic temperature schedules before midnight to cut sleep heating waste footprint."
        };
      }
    })();

    // 3. WATER RECOMMENDATION
    const waterRec = (() => {
      const isHigh = waterUsage > 140;
      const co2Red = (waterUsage * 0.25 * 30.4 * EMISSION_FACTORS.water * 12).toFixed(1);
      const cashSav = Math.round(waterUsage * 0.25 * 30.4 * 0.004);

      if (isHigh) {
        return {
          id: "rec_water",
          category: "Water Footprint",
          icon: Leaf,
          color: "text-blue-500",
          iconBg: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          glowColor: "shadow-blue-500/5",
          title: "Unify under the 5-Minute Shower Habit 🚿",
          description: `With your water baseline of ${waterUsage}L, shortening shower runs stops boiler heating loads and active sewer pump emissions.`,
          difficulty: "Medium" as const,
          co2Reduction: `${co2Red} kg / month`,
          co2Val: parseFloat(co2Red),
          moneySavings: `$${cashSav} / month`,
          moneyVal: cashSav,
          timeRequired: "5 min / daily",
          practicalHint: "Hint: Try matching standard showers to a single cohesive upbeat 5-minute song track."
        };
      } else {
        return {
          id: "rec_water",
          category: "Water Footprint",
          icon: Leaf,
          color: "text-blue-500",
          iconBg: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          glowColor: "shadow-blue-500/5",
          title: "Affix Sink Faucet Pressure Aerators 💧",
          description: "Affix clean flow-limiting solid aerator attachments to hand-washing taps. Splitting stream paths retains pressure at half the run rate.",
          difficulty: "Easy" as const,
          co2Reduction: "3.2 kg / month",
          co2Val: 3.2,
          moneySavings: "$3 / month",
          moneyVal: 3,
          timeRequired: "15 min / once",
          practicalHint: "Hint: Faucet nozzles screw on or clip directly to raw pipe threads with simple manual tuning."
        };
      }
    })();

    // 4. DIET RECOMMENDATION
    const foodRec = (() => {
      const isHeavy = foodHabit === 'heavy_beef' || foodHabit === 'moderate';
      
      if (isHeavy) {
        const co2Red = (EMISSION_FACTORS.food[foodHabit] * 0.45 * 4.3).toFixed(1);
        return {
          id: "rec_food",
          category: "Dietary Alignment",
          icon: Compass,
          color: "text-amber-500",
          iconBg: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          glowColor: "shadow-amber-500/5",
          title: "Launch Meatless Mondays 🥗",
          description: `Your custom of ${foodHabit.replace("_", " ")} carries significant agricultural soil carbon. Trading beef for local lentils once weekly saves massive eco-space.`,
          difficulty: "Medium" as const,
          co2Reduction: `${co2Red} kg / month`,
          co2Val: parseFloat(co2Red),
          moneySavings: "$16 / month",
          moneyVal: 16,
          timeRequired: "10 min / weekly",
          practicalHint: "Hint: Start with high-protein plant-based taco wraps or slow-cooked vegetarian curry."
        };
      } else {
        const co2Red = (EMISSION_FACTORS.food[foodHabit] * 0.25 * 30.4).toFixed(1);
        return {
          id: "rec_food",
          category: "Dietary Alignment",
          icon: Compass,
          color: "text-amber-500",
          iconBg: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          glowColor: "shadow-amber-500/5",
          title: "Exterminate Kitchen Food Waste 🍎",
          description: `Since you maintain a low-carbon diet (${foodHabit.replace("_", " ")}), prevent food rot. Food rotting in landfills generates high methane loads.`,
          difficulty: "Easy" as const,
          co2Reduction: `${co2Red} kg / month`,
          co2Val: parseFloat(co2Red),
          moneySavings: "$28 / month",
          moneyVal: 28,
          timeRequired: "5 min / daily",
          practicalHint: "Hint: Optimize crisper bins, freeze soft bananas for baking, and compost local kitchen scraps."
        };
      }
    })();

    // 5. SHOPPING RECOMMENDATION
    const shoppingRec = (() => {
      const isHeavy = shoppingFrequency === 'super' || shoppingFrequency === 'frequent';
      const reductionCo2 = (EMISSION_FACTORS.shopping[shoppingFrequency] * 0.35 * 30.4).toFixed(1);
      
      if (isHeavy) {
        return {
          id: "rec_shopping",
          category: "Retail Circularity",
          icon: ShoppingBag,
          color: "text-pink-500",
          iconBg: "bg-pink-500/10",
          borderColor: "border-pink-500/20",
          glowColor: "shadow-pink-500/5",
          title: "Set a 30-Day Purchase Cool-off Rule ⏳",
          description: "When buying non-essential clothing or goods, enforce a cohesive 30-day decision delay. This filters high packaging and transport waste.",
          difficulty: "Hard" as const,
          co2Reduction: `${reductionCo2} kg / month`,
          co2Val: parseFloat(reductionCo2),
          moneySavings: "$85 / month",
          moneyVal: 85,
          timeRequired: "Ongoing",
          practicalHint: "Hint: Stash interesting links in a simple notepad line instead of shopping baskets, and verify details later."
        };
      } else {
        return {
          id: "rec_shopping",
          category: "Retail Circularity",
          icon: ShoppingBag,
          color: "text-pink-500",
          iconBg: "bg-pink-500/10",
          borderColor: "border-pink-500/20",
          glowColor: "shadow-pink-500/5",
          title: "Prioritize Circular Thrift Channels 👔",
          description: "Source standard lifestyle garments, kitchen assets, or technology tools secondhand, bypassing production and packaging lines completely.",
          difficulty: "Medium" as const,
          co2Reduction: "5.4 kg / month",
          co2Val: 5.4,
          moneySavings: "$25 / month",
          moneyVal: 25,
          timeRequired: "1 hr / weekly",
          practicalHint: "Hint: Scan digital peer-to-peer wardrobe sharing spaces or thrift portals before checking manufacturing lists."
        };
      }
    })();

    return [commuteRec, electricRec, waterRec, foodRec, shoppingRec];
  }, [transportDistance, vehicleType, electricityUsage, waterUsage, foodHabit, shoppingFrequency, transportDailyEmissions]);

  // Confidence Score Formulation
  // Baseline is 55% if all questions are filled (since we default/fill them), and we add 15% for each checklist verification source
  let confidenceScore = 55;
  if (checkedOdometer) confidenceScore += 12;
  if (checkedElectricBill) confidenceScore += 12;
  if (checkedWaterBill) confidenceScore += 11;
  if (checkedFoodLogs) confidenceScore += 10;

  // Identify highest contributing category
  const categoriesMap = [
    { name: "Transport", val: transportDailyEmissions, key: "transport", color: "#10b981", icon: Footprints, desc: "Commuting and vehicular fuel cycles." },
    { name: "Electricity", val: electricityDailyEmissions, key: "electricity", color: "#06b6d4", icon: Zap, desc: "Home heating, cooling, and electrical grids." },
    { name: "Water", val: waterDailyEmissions, key: "water", color: "#3b82f6", icon: Leaf, desc: "Water pumping, sewage treatment, and supply lines." },
    { name: "Food Diet", val: foodDailyEmissions, key: "food", color: "#f59e0b", icon: Compass, desc: "Agriculture, beef production, and food transports." },
    { name: "Shopping", val: shoppingDailyEmissions, key: "shopping", color: "#ec4899", icon: ShoppingBag, desc: "Consumer goods packaging, freight, and retail." }
  ];

  const highestObj = [...categoriesMap].sort((a, b) => b.val - a.val)[0];
  const highestCategory = highestObj.name;
  const highestCategoryVal = highestObj.val;
  const highestCategoryPercentage = Math.round((highestCategoryVal / emissionsDaily) * 100);

  // Format month list / values helper
  const getFormattedMonth = () => {
    const today = new Date();
    return today.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  const getMonthKey = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${today.getFullYear()}-${mm}`;
  };

  // Saved Calculations persistence (Firebase + Local Storage back-up)
  const fetchSavedCalculations = async () => {
    if (user) {
      setRecordsLoading(true);
      try {
        const calcsCol = collection(db, "users", user.uid, "calculations");
        const querySnap = await getDocs(calcsCol).catch((err) =>
          handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/calculations`)
        );
        
        if (querySnap) {
          const loaded: SavedCalculation[] = [];
          querySnap.forEach((docSnap) => {
            loaded.push(docSnap.data() as SavedCalculation);
          });
          // Sort by timestamp desc
          loaded.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setSavedRecords(loaded);
        }
      } catch (err) {
        console.error("Failed to load calculations from database", err);
      } finally {
        setRecordsLoading(false);
      }
    } else {
      // Local Storage load
      const local = localStorage.getItem("ecotrack-saved-calculations");
      if (local) {
        try {
          const parsed = JSON.parse(local) as SavedCalculation[];
          parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setSavedRecords(parsed);
        } catch {
          setSavedRecords([]);
        }
      } else {
        setSavedRecords(MOCK_COMPARATIVE_RECORDS);
      }
    }
  };

  useEffect(() => {
    fetchSavedCalculations();
  }, [user]);

  // Handle Save Calculation action
  const handleSaveCalculation = async () => {
    setSaveLoading(true);
    setSaveStatus(null);
    const id = "calc_" + Math.random().toString(36).substring(2, 11);
    const timestamp = new Date().toISOString();
    const currentMonthLabel = getFormattedMonth();
    
    // Check if we already have a record for this month to prevent duplicate visual spamming
    const isDuplicateMonth = savedRecords.some((rec) => rec.month === currentMonthLabel);
    const finalMonthLabel = isDuplicateMonth ? `${currentMonthLabel} (Rec #${savedRecords.length + 1})` : currentMonthLabel;

    const newRec: SavedCalculation = {
      id,
      timestamp,
      month: finalMonthLabel,
      transportDistance,
      vehicleType,
      electricityUsage,
      waterUsage,
      foodHabit,
      shoppingFrequency,
      emissionsDaily: parseFloat(emissionsDaily.toFixed(2)),
      emissionsMonthly: parseFloat(emissionsMonthly.toFixed(1)),
      emissionsAnnual: parseFloat(emissionsAnnual.toFixed(1)),
      confidenceScore,
      highestCategory
    };

    if (user) {
      try {
        const docRef = doc(db, "users", user.uid, "calculations", id);
        await setDoc(docRef, newRec).catch((err) =>
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/calculations/${id}`)
        );
        
        // Prepend and refresh state
        setSavedRecords((prev) => [newRec, ...prev]);
        setSaveStatus("success");
      } catch (err) {
        setSaveStatus("error");
        console.error("Error saving to Firestore", err);
      } finally {
        setSaveLoading(false);
      }
    } else {
      // Save local storage
      const existing = [...savedRecords];
      // If we were showing mock, flush them since user has started custom saving
      const cleanExisting = existing.filter(r => !r.id.startsWith("mock_"));
      const updated = [newRec, ...cleanExisting];
      localStorage.setItem("ecotrack-saved-calculations", JSON.stringify(updated));
      setSavedRecords(updated);
      setSaveStatus("local-success");
      setSaveLoading(false);
    }
  };

  // Delete records
  const handleDeleteRecord = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "calculations", id)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/calculations/${id}`)
        );
        setSavedRecords((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error("Failed to delete calculations", err);
      }
    } else {
      // Local delete
      const updated = savedRecords.filter((r) => r.id !== id);
      localStorage.setItem("ecotrack-saved-calculations", JSON.stringify(updated));
      setSavedRecords(updated);
    }
  };

  // Interactive dynamic explanations
  const getHighestCategoryExplanation = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "transport":
        return {
          title: "Vehicular Emissions Lead Your Carbon Load 🚗",
          text: `Your daily commute with a ${vehicleType} vehicle constitutes the heaviest slice of your emissions profile. Transport accounts for approximately ${highestCategoryPercentage}% of your direct emissions index.`,
          fix: "Consider planning hybrid transit days, replacing short trips with mechanical bicycle cycles, or exploring electronic vehicles."
        };
      case "electricity":
        return {
          title: "Home Grid Load Dominates Energy Metric ⚡",
          text: `Your electricity use of ${electricityUsage} kWh/month translates to robust power output at fuel grids. This contributes ${highestCategoryPercentage}% of your global environmental footprint.`,
          fix: "Applying thermostat ranges from 19-21°C, auditing phantom plug loads, or transition to LED setups can yield 30% monthly offsets."
        };
      case "water":
        return {
          title: "Intense Water Utility Multiplier Mapped 💧",
          text: `Your average daily water usage of ${waterUsage}L requires massive pumping and infrastructure treatment energy. It is currently your highest active emission variable.`,
          fix: "Reducing shower layouts to 5 minute marks and utilizing greywater recovery models helps de-risk ecological water strains."
        };
      case "food diet":
        return {
          title: "Dietary Preferences Dominate Your Ecosystem 🍔",
          text: `A dietary baseline of ${foodHabit.replace("_", " ")} carries significant agricultural footprint requirements, equating to ${highestCategoryPercentage}% of your calculated atmospheric load.`,
          fix: "Replacing 3 red-meat servings with lentils and leafy greens monthly can drop aggregate diet metrics by up to 40%."
        };
      case "shopping":
        return {
          title: "High Retail Packaging & Supply Trace 🛍️",
          text: `Your consumer purchasing frequency rates generate heavy packaging, air freight cargo metrics, and shipping waste, representing ${highestCategoryPercentage}% of your footprint.`,
          fix: "Commit to minimalist purchasing intervals, buy durable second-hand alternatives, and minimize single-use packaging cycles."
        };
      default:
        return {
          title: "Balanced Carbon Footprint 🌿",
          text: "Your carbon footprint contributions are relatively balanced across transport, electricity grids, water consumption, dietary habits, and shopping ranges.",
          fix: "Focus on continuous small adjustments, using verification trackers to build reliable green streaks."
        };
    }
  };

  const explanation = getHighestCategoryExplanation(highestCategory);

  return (
    <div className="space-y-10 text-left">
      
      {/* SECTION BANNER SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b pb-6 border-slate-200/10 dark:border-slate-800/60 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 mb-3">
            <Calculator className="w-3.5 h-3.5" />
            Empirical Baseline Analytics
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-850 dark:text-white leading-tight">
            Atmospheric Carbon Calculator
          </h2>
          <p className="text-xs text-slate-400 max-w-xl mt-1.5">
            Identify hot spots, estimate daily outputs, and save monthly calculations to build reliable, de-risked historical ledgers.
          </p>
        </div>
        
        {/* Real-time floating counter */}
        <div className="px-5 py-4.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left min-w-[190px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-mono">Current Daily Score</span>
          <span className="block text-2xl font-black text-emerald-600 dark:text-white font-mono mt-0.5">
            {emissionsDaily.toFixed(1)} <span className="text-xs font-normal">kg CO2e</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-1 leading-snug">
            Equivalent to planting <b>{(emissionsAnnual / 22).toFixed(1)}</b> trees annually.
          </span>
        </div>
      </div>

      {/* SUB-TAB NAV PILLS */}
      <div className="flex border-b border-slate-200/10 dark:border-slate-800/60 pb-1 gap-4">
        <button
          onClick={() => setActiveCalcSubTab("calculator")}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer outline-none ${
            activeCalcSubTab === "calculator"
              ? "border-emerald-500 text-emerald-505 dark:text-emerald-400"
              : "text-slate-450 hover:text-slate-300 border-transparent"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Atmospheric Calculator
        </button>
        <button
          onClick={() => setActiveCalcSubTab("recommendations")}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer outline-none relative ${
            activeCalcSubTab === "recommendations"
              ? "border-emerald-500 text-emerald-505 dark:text-emerald-400"
              : "text-slate-450 hover:text-slate-300 border-transparent"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          Expert Recommended Plan
          <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-mono text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
            5
          </span>
        </button>
      </div>

      {activeCalcSubTab === "calculator" && (
        /* CORE MATRIX CARD GRID split */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          
          {/* Left Input form Column (Span 7) */}
          <div className="xl:col-span-7 space-y-6">
            <div className={`rounded-3xl p-6 border transition-all ${
              isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className="text-sm font-black font-display text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b pb-3 border-slate-200/50 dark:border-slate-800/60 mb-6 flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-emerald-500" />
                Resource Input Matrix
              </h3>

              <div className="space-y-6">
                {/* Daily Transport Range Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label htmlFor="transport-slider" className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Footprints className="w-4 h-4 text-emerald-500" />
                      Daily Commute Distance
                    </label>
                    <span className="font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      {transportDistance} km / day
                    </span>
                  </div>
                  <input
                    id="transport-slider"
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={transportDistance}
                    onChange={(e) => setTransportDistance(parseInt(e.target.value) || 0)}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>0 km</span>
                    <span>60 km (Average)</span>
                    <span>120 km</span>
                  </div>
                </div>

                {/* Vehicle Type selection */}
                <div className="space-y-2.5">
                  <label htmlFor="vehicle-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Primary Commuting Vehicle Type
                  </label>
                  <div className="relative">
                    <select
                      id="vehicle-select"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                      className={`w-full px-4 py-3 rounded-xl text-xs font-semibold border bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${
                        isDark ? "border-slate-800 bg-slate-950 focus:border-slate-700" : "border-slate-200 bg-white focus:border-slate-400"
                      }`}
                    >
                      <option value="petrol">Petrol Powered Car (Standard: 0.18 kg/km)</option>
                      <option value="diesel">Heavy Diesel Car (High Peak: 0.20 kg/km)</option>
                      <option value="hybrid">Efficient Hybrid Car (Mild: 0.09 kg/km)</option>
                      <option value="electric">Battery Electric Car (Grid Induced: 0.05 kg/km)</option>
                      <option value="motorcycle">Motorcycle / Scooter (0.10 kg/km)</option>
                      <option value="public">Transit Public Lines / Bus & Train (Coactive: 0.04 kg/km)</option>
                      <option value="none">Bicycle / Pedestrian Walk (Zero Carbon: 0.0 kg/km)</option>
                    </select>
                  </div>
                </div>

                {/* Grid 2 Columns for Utilities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Electricity card Input */}
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950/40 border-slate-850/60" : "bg-slate-50 border-slate-200/80"
                  }`}>
                    <label htmlFor="electricity-input" className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 mb-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Electricity Schedule
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="electricity-input"
                        type="number"
                        min="0"
                        max="1500"
                        value={electricityUsage}
                        onChange={(e) => setElectricityUsage(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold bg-transparent text-slate-800 dark:text-white ${
                          isDark ? "border-slate-800 focus:border-slate-700" : "border-slate-300 focus:border-slate-400"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-slate-400 select-none shrink-0">
                        kWh / month
                      </span>
                    </div>
                  </div>

                  {/* Water Usage Card input */}
                  <div className={`p-4 rounded-2xl border ${
                    isDark ? "bg-slate-950/40 border-slate-850/60" : "bg-slate-50 border-slate-200/80"
                  }`}>
                    <label htmlFor="water-input" className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 mb-2">
                      <Leaf className="w-4 h-4 text-blue-500" />
                      Water Utility Flow
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="water-input"
                        type="number"
                        min="0"
                        max="1000"
                        value={waterUsage}
                        onChange={(e) => setWaterUsage(Math.max(0, parseInt(e.target.value) || 0))}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold bg-transparent text-slate-800 dark:text-white ${
                          isDark ? "border-slate-800 focus:border-slate-700" : "border-slate-300 focus:border-slate-400"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-slate-400 select-none shrink-0">
                        Liters / day
                      </span>
                    </div>
                  </div>

                </div>

                {/* Food Diet Options row */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-305 block">
                    Dietary Habits Baseline
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { key: "vegan", label: "Vegan", col: "border-emerald-500/20 hover:bg-emerald-500/5 text-emerald-500 font-bold" },
                      { key: "vegetarian", label: "Vegetarian", col: "border-teal-500/20 hover:bg-teal-500/5 text-teal-500 font-bold" },
                      { key: "pescatarian", label: "Pescatarian", col: "border-blue-500/20 hover:bg-blue-500/5 text-blue-500 font-bold" },
                      { key: "moderate", label: "Mod Meat", col: "border-amber-500/20 hover:bg-amber-500/5 text-amber-550 font-bold" },
                      { key: "heavy_beef", label: "High Beef", col: "border-rose-500/20 hover:bg-rose-500/5 text-rose-500 font-bold" }
                    ].map((btn) => {
                      const isSelected = foodHabit === btn.key;
                      return (
                        <button
                          key={btn.key}
                          onClick={() => setFoodHabit(btn.key as any)}
                          type="button"
                          className={`py-3 px-2 rounded-xl border text-[10px] text-center font-bold tracking-tight transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:text-emerald-400 shadow-sm shadow-emerald-500/10" 
                              : `bg-transparent border-slate-200 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400`
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shopping Frequency Options raw */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-305 block">
                    Purchasing & Shopping Frequency
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "rare", label: "Minimalist/Rare", desc: "Rare brand assets" },
                      { key: "average", label: "Average Shopper", desc: "Some garments" },
                      { key: "frequent", label: "Frequent/Active", desc: "Frequent buying" },
                      { key: "super", label: "Super Spender", desc: "Mega consumers" }
                    ].map((btn) => {
                      const isSelected = shoppingFrequency === btn.key;
                      return (
                        <button
                          key={btn.key}
                          onClick={() => setShoppingFrequency(btn.key as any)}
                          type="button"
                          className={`py-3 px-2 rounded-xl text-left border px-3 transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 dark:text-emerald-400 shadow-sm" 
                              : "bg-transparent border-slate-200 dark:border-slate-850 hover:border-slate-450 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <span className="block text-[10px] font-black leading-tight">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* CONFIDENCE CHECKLIST CARD PANEL */}
            <div className={`rounded-xl p-5 border text-left ${
              isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex justify-between items-center border-b pb-3 border-slate-205/40 dark:border-slate-800/60 mb-4 animate-in fade-in">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Award className="w-4.5 h-4.5 text-amber-500" />
                    Source Verifications Checklist
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Check sources you verified to elevate calculator confidence and earn trophies.
                  </p>
                </div>
                
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Confidence</span>
                  <span className={`text-sm font-black font-mono leading-none ${
                      confidenceScore > 85 
                        ? "text-emerald-500" 
                        : confidenceScore > 65 
                          ? "text-teal-400" 
                          : "text-amber-500"
                    }`}>
                    {confidenceScore}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { state: checkedOdometer, setter: setCheckedOdometer, label: "Checked odometer / travel maps", hint: "Verifies Commute (+12%)" },
                  { state: checkedElectricBill, setter: setCheckedElectricBill, label: "Read exact utility electric bill", hint: "Verifies grid load (+12%)" },
                  { state: checkedWaterBill, setter: setCheckedWaterBill, label: "Inspected water account meters", hint: "Verifies water utility (+11%)" },
                  { state: checkedFoodLogs, setter: setCheckedFoodLogs, label: "Tracked diet items this week", hint: "Verifies lifestyle (+10%)" }
                ].map((item, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      item.state 
                        ? "bg-slate-500/5 border-emerald-500/30 text-slate-805 dark:text-white" 
                        : "bg-transparent border-slate-200/60 dark:border-slate-850/60 text-slate-450 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div>
                      <span className="block text-[11px] font-semibold leading-tight">{item.label}</span>
                      <span className="text-[9px] font-mono text-emerald-500 block leading-none mt-1">{item.hint}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Right Output Results Column (Span 5) */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* CALCULATED RESULTS CARDS */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* Daily card */}
              <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 relative overflow-hidden ${
                isDark ? "bg-[#0b241b] border-emerald-500/20" : "bg-emerald-50/40 border-emerald-500/20 shadow-sm"
              }`}>
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Daily Average</span>
                <div>
                  <span className="block text-2xl font-black font-mono text-emerald-500 leading-none">
                    {emissionsDaily.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1 font-semibold leading-none">kg CO2e</span>
                </div>
              </div>

              {/* Monthly Card */}
              <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 relative overflow-hidden ${
                isDark ? "bg-[#072428] border-cyan-500/20" : "bg-cyan-50/40 border-cyan-500/20 shadow-sm"
              }`}>
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monthly total</span>
                <div>
                  <span className="block text-2xl font-black font-mono text-cyan-400 leading-none">
                    {Math.round(emissionsMonthly)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1 font-semibold leading-none">kg CO2e</span>
                </div>
              </div>

              {/* Annual Card */}
              <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 relative overflow-hidden ${
                isDark ? "bg-[#181329] border-indigo-500/20" : "bg-indigo-50/40 border-indigo-500/20 shadow-sm"
              }`}>
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">annual Total</span>
                <div>
                  <span className="block text-2xl font-black font-mono text-indigo-400 leading-none">
                    {(emissionsAnnual / 1000).toFixed(1)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1 font-semibold leading-none">tonnes CO2e</span>
                </div>
              </div>

            </div>

            {/* DYNAMIC CATEGORY ASSIGNMENT DONUT / BAR CHART GRAPHICS */}
            <div className={`rounded-3xl p-5 border text-left ${
              isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`} ref={chartContainerRef}>
              
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b pb-3 border-slate-205/40 dark:border-slate-800/60 mb-5">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                  Category Breakdown Area
                </span>
                <span className="text-[9px] font-mono font-medium text-slate-450 dark:text-slate-500">Hover sectors for details</span>
              </h4>

              {/* Custom SVG horizontal bar charts representing categories */}
              <div className="space-y-[15px] select-none py-2">
                {categoriesMap.map((sect, idx) => {
                  const percentage = Math.round((sect.val / emissionsDaily) * 100) || 0;
                  const isHovered = activeCategoryIndex === idx;

                  return (
                    <div 
                      key={sect.key} 
                      className="space-y-1.5 cursor-pointer"
                      onMouseEnter={() => setActiveCategoryIndex(idx)}
                      onMouseLeave={() => setActiveCategoryIndex(null)}
                    >
                      <div className="flex justify-between items-center text-[11px] leading-tight font-medium">
                        <div className="flex items-center gap-2">
                          <sect.icon className="w-3.5 h-3.5" style={{ color: sect.color }} />
                          <span className="text-slate-750 dark:text-slate-300 font-bold">{sect.name}</span>
                        </div>
                        <div className="font-mono text-slate-450 dark:text-slate-400 flex items-baseline gap-1.5 font-bold">
                          <span>{sect.val.toFixed(1)} kg/day</span>
                          <span className="text-[9px]" style={{ color: sect.color }}>({percentage}%)</span>
                        </div>
                      </div>
                      
                      {/* SVG Progress bar tracker */}
                      <div className="relative w-full h-[18px] rounded-lg overflow-hidden bg-slate-200/50 dark:bg-slate-850 border border-slate-400/5 dark:border-slate-800/40 flex items-center">
                        <div 
                          className="h-full rounded-r-lg transition-all duration-500 relative" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: sect.color, 
                            opacity: isHovered ? 0.95 : 0.7 
                          }}
                        />
                        {/* Active shine overlays */}
                        {isHovered && (
                          <div className="absolute inset-x-0 h-full bg-white/10 animate-pulse pointer-events-none" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend detail text panel */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                {activeCategoryIndex !== null ? (
                  <div className="space-y-1 animate-in fade-in slide-in-from-bottom-1 duration-150">
                    <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ backgroundColor: `${categoriesMap[activeCategoryIndex].color}20`, color: categoriesMap[activeCategoryIndex].color }}>
                      {categoriesMap[activeCategoryIndex].name} Detail
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                      {categoriesMap[activeCategoryIndex].desc} Estimated daily carbon mass is <b>{categoriesMap[activeCategoryIndex].val.toFixed(2)} kg CO2e</b>.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic font-medium leading-normal">
                    Hover details above to read descriptions on Transport, Electricity, Water, Food, and Retail shopping sectors.
                  </p>
                )}
              </div>

            </div>

            {/* HARDENED EXPLANATORY HERO BOX for Highest category */}
            <div className={`rounded-3xl p-5 border text-left space-y-3 relative overflow-hidden transition-all shadow-xl bg-gradient-to-br ${
              isDark 
                ? "from-slate-900/60 via-slate-950 to-slate-900/40 border-indigo-500/20" 
                : "from-white via-indigo-50/20 to-slate-50/50 border-indigo-500/10 shadow-md"
            }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex gap-2.5 items-start">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-bold font-mono text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">AI Footprint Assessment</span>
                  <h4 className="text-xs font-bold text-slate-805 dark:text-white">
                    {explanation.title}
                  </h4>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
                {explanation.text}
              </p>

              <div className={`p-3 rounded-2xl border text-[11px] font-medium leading-relaxed flex gap-2 text-left ${
                isDark ? "bg-indigo-950/20 border-indigo-900/40 text-slate-350" : "bg-indigo-50/40 border-indigo-100 text-slate-655"
              }`}>
                <AlertTriangle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <b className="text-indigo-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Primary Mitigation Opportunity:</b>
                  {explanation.fix}
                </div>
              </div>
            </div>

            {/* SAVE BUTTON FOR LOG RECORDS */}
            <div className="pt-3">
              <button
                onClick={handleSaveCalculation}
                disabled={saveLoading}
                className={`w-full py-4 text-xs font-bold tracking-wider uppercase rounded-2xl transition-all shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5 outline-none active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                  saveLoading 
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                    : "bg-[#0c3e2e] dark:bg-emerald-600 text-white hover:bg-[#072a1f] dark:hover:bg-emerald-500 font-bold"
                }`}
              >
                <Sparkles className={`w-4 h-4 ${saveLoading ? "animate-spin" : "animate-pulse"}`} />
                <span>{saveLoading ? "Saving Log to ledger..." : "Save Calculation state & Compare"}</span>
              </button>

              {/* Notification alert states response feedback */}
              {saveStatus === "success" && (
                <p className="mt-3 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-emerald-500/10 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Calculation verified & synced securely into your Firebase cloud database.
                </p>
              )}
              {saveStatus === "local-success" && (
                <div className="mt-3 p-3.5 rounded-2xl border border-blue-500/10 bg-blue-500/5 text-left text-[11px] leading-relaxed space-y-2 animate-in fade-in">
                  <p className="text-blue-500 dark:text-blue-400 font-bold flex items-center gap-1.5 leading-none">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved locally under anonymous local state.
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Sign in with Google to persistent lock your calculations within secure databases and enable planetary charts.
                  </p>
                  <button 
                    onClick={onOpenSignIn}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer block"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}
              {saveStatus === "error" && (
                <p className="mt-3 text-[10px] text-rose-500 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/10 flex items-center gap-1.5 animate-in">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                  Save failure. Permission check failed inside client rules. Use verify check.
                </p>
              )}
            </div>

          </div>

        </div>
      )}

      {activeCalcSubTab === "recommendations" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* EXPERT BANNER DIALOGUE */}
          <div className={`p-6 rounded-3xl border relative overflow-hidden flex flex-col md:flex-row gap-5 items-start ${
            isDark 
              ? "bg-slate-900/60 via-slate-950 to-slate-900/40 border-emerald-500/10 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80" 
              : "bg-emerald-50/5 border-slate-200"
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-1 text-left">
              <span className="text-[10px] uppercase font-mono font-bold text-emerald-500 tracking-wider">ENVIRONMENTAL SUSTAINABILITY CONSULTANT</span>
              <h3 className="text-sm font-black font-display text-slate-850 dark:text-white leading-tight">
                Personalized Adaptive Playbook for Atmospheric Abatement
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl mt-1.5">
                Excellent work on calculating your carbon inputs. Observing your monthly emission profile of <b>{Math.round(emissionsMonthly)} kg CO2e</b>, with your primary intensity peak residing inside your <b>{highestCategory}</b> category, I've designed the following 5 realistic, high-leverage micro-adjustments tailored to your exact daily lifestyle.
              </p>
            </div>
          </div>

          {/* PERFORMANCE / COMMITMENT DASHBOARD PANEL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CARD 1: COMMITTED COUNT */}
            <div className={`p-4.5 rounded-2xl border text-left flex flex-col justify-between ${
              isDark ? "bg-slate-900/30 border-slate-850" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-400">Adopted Commitment Load</span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-emerald-500">{committedIds.length}</span>
                <span className="text-slate-450 text-xs font-bold">/ 5 Actions Active</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-[9px] font-semibold text-slate-450">
                  <span>Progress Metric</span>
                  <span>{committedIds.length * 20}%</span>
                </div>
                <div className="w-full h-1.5 rounded bg-slate-200 dark:bg-slate-850 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-350" 
                    style={{ width: `${committedIds.length * 20}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: CO2 MONTHLY REDUCTION */}
            <div className={`p-4.5 rounded-2xl border text-left flex flex-col justify-between h-30 relative overflow-hidden ${
              isDark ? "bg-[#0b241b] border-emerald-500/20" : "bg-emerald-50/40 border-emerald-500/20 shadow-sm"
            }`}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Committed Carbon Abatement</span>
              <div className="mt-3">
                <span className="text-2xl font-black font-mono text-emerald-500 leading-none">
                  {expertRecommendations
                    .filter(rec => committedIds.includes(rec.id))
                    .reduce((acc, rec) => acc + rec.co2Val, 0)
                    .toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-405 block mt-1 font-semibold leading-none">kg CO2e / month avoided</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">
                Equivalent to planting approx <b>{(expertRecommendations.filter(rec => committedIds.includes(rec.id)).reduce((acc, rec) => acc + rec.co2Val, 0) * 12 / 22).toFixed(1)}</b> trees annually.
              </p>
            </div>

            {/* CARD 3: WALLET SAVINGS */}
            <div className={`p-4.5 rounded-2xl border text-left flex flex-col justify-between h-30 relative overflow-hidden ${
              isDark ? "bg-[#072428] border-cyan-500/20" : "bg-cyan-50/40 border-cyan-500/20 shadow-sm"
            }`}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Projected Wallet Retention</span>
              <div className="mt-3">
                <span className="text-2xl font-black font-mono text-cyan-400 leading-none">
                  ${expertRecommendations
                    .filter(rec => committedIds.includes(rec.id))
                    .reduce((acc, rec) => acc + rec.moneyVal, 0)}
                </span>
                <span className="text-[9px] text-slate-405 block mt-1 font-semibold leading-none">Saved per month in utilities & fuel</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">
                Direct financial return from efficient consumption models.
              </p>
            </div>
          </div>

          {/* TOP 5 RECOMMENDATIONS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {expertRecommendations.map((rec) => {
              const isCommitted = committedIds.includes(rec.id);
              const isCompleted = completedIds.includes(rec.id);
              const IconComponent = rec.icon;

              return (
                <div 
                  key={rec.id}
                  className={`p-6 rounded-3xl border transition-all duration-300 relative flex flex-col justify-between ${
                    isCommitted 
                      ? isDark 
                        ? "bg-slate-900 border-emerald-500/40 shadow-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-[#0e3122]/35"
                        : "bg-emerald-50/15 border-emerald-500/40 shadow bg-gradient-to-tr from-slate-50 via-white to-emerald-50/5 text-slate-900"
                      : isDark 
                        ? "bg-slate-900/40 border-slate-850 hover:border-slate-700" 
                        : "bg-white border-slate-200 hover:border-slate-350 shadow-sm"
                  }`}
                >
                  {/* Top Header Row of card */}
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${rec.iconBg} ${rec.color}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${rec.color}`}>
                            {rec.category}
                          </span>
                          <h4 className="text-sm font-black text-slate-805 dark:text-white leading-tight">
                            {rec.title}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                          rec.difficulty === "Easy" 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : rec.difficulty === "Medium"
                              ? "bg-cyan-500/10 text-cyan-500"
                              : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {rec.difficulty}
                        </span>
                        {isCommitted && (
                          <span className="block text-[8px] font-mono text-emerald-500 font-extrabold tracking-wider uppercase mt-1">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left py-4">
                      {rec.description}
                    </p>
                  </div>

                  {/* Core Metrics & Action buttons */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Metric 1 */}
                      <div className={`p-2 rounded-xl text-center border ${
                        isDark ? "bg-slate-950/45 border-slate-850/60" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span className="block text-[8px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-center gap-0.5 mb-1">
                          <Leaf className="w-2.5 h-2.5 text-emerald-500 animate-pulse" /> Offset
                        </span>
                        <span className="text-[11px] font-bold font-mono text-emerald-500 leading-none">
                          {rec.co2Reduction}
                        </span>
                      </div>

                      {/* Metric 2 */}
                      <div className={`p-2 rounded-xl text-center border ${
                        isDark ? "bg-slate-950/45 border-slate-850/60" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span className="block text-[8px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-center gap-0.5 mb-1">
                          <Coins className="w-2.5 h-2.5 text-cyan-400" /> Wallet
                        </span>
                        <span className="text-[11px] font-bold font-mono text-cyan-400 leading-none">
                          {rec.moneySavings}
                        </span>
                      </div>

                      {/* Metric 3 */}
                      <div className={`p-2 rounded-xl text-center border ${
                        isDark ? "bg-slate-950/45 border-slate-850/60" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span className="block text-[8px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-center gap-0.5 mb-1">
                          <Clock className="w-2.5 h-2.5" /> Time
                        </span>
                        <span className="text-[11px] font-bold font-mono text-slate-450 dark:text-slate-300 leading-none whitespace-nowrap">
                          {rec.timeRequired}
                        </span>
                      </div>
                    </div>

                    {/* Hint Row */}
                    <div className={`p-2.5 rounded-2xl border text-[10px] text-slate-450 dark:text-slate-400 leading-relaxed text-left ${
                      isDark ? "bg-slate-950/20 border-slate-850/40" : "bg-slate-50 border-slate-100"
                    }`}>
                      {rec.practicalHint}
                    </div>

                    {/* Operational Switch buttons */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        onClick={() => {
                          if (isCommitted) {
                            setCommittedIds((prev) => prev.filter((id) => id !== rec.id));
                          } else {
                            setCommittedIds((prev) => [...prev, rec.id]);
                          }
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer outline-none ${
                          isCommitted
                            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-extrabold"
                            : "bg-slate-500/10 hover:bg-slate-500/15 text-slate-300 border border-slate-350/15"
                        }`}
                      >
                        {isCommitted ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Committed
                          </>
                        ) : (
                          "Commit to Action"
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (isCompleted) {
                            setCompletedIds((prev) => prev.filter((id) => id !== rec.id));
                          } else {
                            setCompletedIds((prev) => [...prev, rec.id]);
                          }
                        }}
                        className={`py-2 px-3.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer outline-none ${
                          isCompleted
                            ? "bg-cyan-500 text-slate-950 font-extrabold"
                            : "bg-slate-500/5 hover:bg-slate-500/10 text-slate-400 border border-slate-300/10"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isCompleted ? "Done Today" : "Track log"}</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* SUSTAINABILITY METRICS SCALE STATEMENT FOOTER */}
          <div className={`p-5 rounded-2xl border text-slate-400 text-xs text-left leading-normal space-y-1 relative overflow-hidden ${
            isDark ? "bg-slate-900/30 border-slate-850" : "bg-white border-slate-250 shadow-sm"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <p className="font-bold text-slate-300 dark:text-slate-205 flex items-center gap-1.5 leading-none">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Sustained Expert Analysis:
            </p>
            <p className="text-[11px] leading-relaxed">
              Enlisting in all 5 dynamic actions avoids upwards of <b>{expertRecommendations.reduce((acc, rec) => acc + rec.co2Val, 0).toFixed(1)} kg CO2e / month</b>, while protecting <b>${expertRecommendations.reduce((acc, rec) => acc + rec.moneyVal, 0)} per month</b> in cash flows! Complete actions above to trace real reduction targets.
            </p>
          </div>
        </div>
      )}

      {/* COMPARATIVE SECTION PLOTTING PREVIOUS MONTHS */}
      <div className={`rounded-3xl p-6 border text-left ${
        isDark ? "bg-slate-900/30 border-slate-850" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-200/60 dark:border-slate-800/60 mb-6 gap-3">
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm font-black font-display text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-emerald-500" />
              Historical Carbon Ledger List
            </h3>
            <p className="text-[10px] text-slate-400">
              Analyze monthly variations, track savings milestones, and prune historical snapshots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase font-mono px-3 py-1 rounded bg-slate-500/10 text-slate-400">
              {savedRecords.length} Calculations Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Dynamic Comparison Chart of Months (Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative p-4 rounded-2xl bg-slate-500/5 border border-slate-205/5 text-center min-h-[240px] flex flex-col justify-between items-center overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="w-full text-left flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 font-mono">Monthly total (kg CO2e) comparison</span>
                <span className="text-[9px] text-slate-400 italic">Hover columns for carbon metric details</span>
              </div>

              {/* DRAW INTERACTIVE COMPARANT SVG BAR CHART of saved records */}
              {savedRecords.length > 0 ? (
                <div className="w-full select-none flex flex-col items-center justify-center">
                  {/* Interactive custom built SVG comparison chart */}
                  <svg 
                    width={svgWidth} 
                    height={160} 
                    className="overflow-visible"
                  >
                    {/* Horizontal threshold reference line */}
                    <line
                      x1={30}
                      y1={80}
                      x2={svgWidth - 10}
                      y2={80}
                      stroke="rgba(16,185,129,0.15)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {/* Chart columns display loop */}
                    {(() => {
                      // Take up to 6 of the oldest among active records in original order so charts show chronological progress
                      const chartData = [...savedRecords]
                        .slice(0, 6)
                        .reverse();
                      
                      const maxVal = Math.max(...chartData.map((r) => r.emissionsMonthly), 300);
                      const chartHeight = 110;
                      const paddingLeft = 40;
                      const paddingRight = 10;
                      const space = svgWidth - paddingLeft - paddingRight;
                      const colWidth = Math.min(32, space / chartData.length - 12);
                      const step = space / chartData.length;

                      return (
                        <g>
                          {chartData.map((rec, index) => {
                            const h = (rec.emissionsMonthly / maxVal) * chartHeight;
                            const x = paddingLeft + (index * step) + (step - colWidth) / 2;
                            const y = 10 + chartHeight - h;
                            const isHovered = compareHoverIndex === index;

                            return (
                              <g 
                                key={rec.id}
                                className="cursor-help"
                                onMouseEnter={() => setCompareHoverIndex(index)}
                                onMouseLeave={() => setCompareHoverIndex(null)}
                              >
                                {/* Background tracing capsule */}
                                <rect
                                  x={x - 2}
                                  y={10}
                                  width={colWidth + 4}
                                  height={chartHeight + 4}
                                  fill="rgba(255,255,255,0.01)"
                                  rx={4}
                                />
                                
                                {/* Target Fill Column */}
                                <rect
                                  x={x}
                                  y={y}
                                  width={colWidth}
                                  height={Math.max(h, 4)}
                                  fill={isHovered ? "#10b981" : isDark ? "#06b6d4" : "#0284c7"}
                                  fillOpacity={isHovered ? 0.95 : 0.6}
                                  rx={4}
                                  className="transition-all duration-300"
                                />

                                {/* Interactive value hovering details tag */}
                                {isHovered && (
                                  <g>
                                    <rect
                                      x={x - 15}
                                      y={y - 25}
                                      width={colWidth + 30}
                                      height={18}
                                      fill="#0f172a"
                                      stroke="#10b981"
                                      strokeWidth={1}
                                      rx={4}
                                    />
                                    <text
                                      x={x + colWidth / 2}
                                      y={y - 13}
                                      textAnchor="middle"
                                      fill="#fff"
                                      className="text-[9px] font-bold font-mono"
                                    >
                                      {Math.round(rec.emissionsMonthly)}kg
                                    </text>
                                  </g>
                                )}

                                {/* Label description below */}
                                <text
                                  x={x + colWidth / 2}
                                  y={chartHeight + 25}
                                  textAnchor="middle"
                                  className="text-[9px] font-sans font-black fill-slate-400 dark:fill-slate-500"
                                >
                                  {rec.month.length > 9 ? rec.month.substring(0, 8) + ".." : rec.month}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-auto space-y-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400">No calculations verified yet in current user profile.</p>
                  <p className="text-[10px] text-slate-500">Inputs your details and click the save button above to project comparisons.</p>
                </div>
              )}
              
              <div className="w-full text-center border-t border-slate-200/50 dark:border-slate-800/40 pt-2 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Low values indicate progression toward 2030 targets.
                </span>
                {savedRecords.some(r => r.id.startsWith("mock_")) && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                    Showing Mock Demo Data
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Ledger scroll list with Delete (Span 5) */}
          <div className="lg:col-span-5 space-y-3.5">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Calculation Ledger records</span>
            
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {savedRecords.length > 0 ? (
                savedRecords.map((record) => (
                  <div 
                    key={record.id}
                    className={`p-3 rounded-2xl border transition-all hover:bg-slate-550/10 flex items-center justify-between text-left ${
                      isDark ? "bg-slate-950/60 border-slate-850/60" : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-805 dark:text-white leading-none whitespace-nowrap block">
                          {record.month}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-500 font-medium">
                          {record.confidenceScore}% conf
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-450 dark:text-slate-400">
                        <span>Daily: <b>{record.emissionsDaily} kg</b></span>
                        <span>·</span>
                        <span className="text-emerald-555 dark:text-emerald-400">Peak: <b>{record.highestCategory}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <span className="block text-[11px] font-bold font-mono text-slate-800 dark:text-slate-100">
                          {Math.round(record.emissionsMonthly)} kg
                        </span>
                        <span className="text-[8px] uppercase tracking-wider font-mono text-slate-400 leading-none">Monthly</span>
                      </div>
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        disabled={record.id.startsWith("mock_")}
                        className={`p-2 rounded-xl border text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ${
                          record.id.startsWith("mock_") ? "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-400" : ""
                        }`}
                        title={record.id.startsWith("mock_") ? "Cannot delete demo data" : "Delete calculations profile"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10.5px] italic text-slate-400 text-left font-medium py-6">
                  No records stored yet. Change the metrics parameters above and click "Save Calculation state" to save.
                </p>
              )}
            </div>

            {/* Quick sync callout banner */}
            {!user && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs text-slate-400 leading-normal">
                💡 Sync calculations to the cloud by signing in with Google! That way your achievements are persistent forever.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

// Mock records for pre-login demos & layout comparisons
const MOCK_COMPARATIVE_RECORDS: SavedCalculation[] = [
  {
    id: "mock_1",
    timestamp: "2026-04-10T12:00:00Z",
    month: "April 2026",
    transportDistance: 45,
    vehicleType: "petrol",
    electricityUsage: 210,
    waterUsage: 150,
    foodHabit: "moderate",
    shoppingFrequency: "frequent",
    emissionsDaily: 16.5,
    emissionsMonthly: 501.6,
    emissionsAnnual: 6022.5,
    confidenceScore: 68,
    highestCategory: "Transport"
  },
  {
    id: "mock_2",
    timestamp: "2026-05-10T12:00:00Z",
    month: "May 2026",
    transportDistance: 25,
    vehicleType: "hybrid",
    electricityUsage: 180,
    waterUsage: 120,
    foodHabit: "vegetarian",
    shoppingFrequency: "average",
    emissionsDaily: 11.2,
    emissionsMonthly: 340.5,
    emissionsAnnual: 4088.0,
    confidenceScore: 85,
    highestCategory: "Electricity"
  }
];
