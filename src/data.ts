import { Activity, Goal, Badge, CommunityChallenge } from "./types";

// CO2 emission factors (in kg CO2e per unit)
export const CARBON_FACTORS = {
  transport: {
    gas_car: 0.21,  // per km
    hybrid_car: 0.11, // per km
    ev: 0.04,      // per km
    transit: 0.05, // per km
    bike_walk: 0   // fully zero carbon
  },
  electricity: {
    grid_standard: 0.39, // per kWh
    grid_smart: 0.22,    // per kWh with off-peak optimization
    solar_renew: 0.02    // solar infrastructure upkeep
  },
  food: {
    beef_lamb: 7.4,   // high carbon meal
    poultry_fish: 2.3, // medium carbon meal
    vegetarian: 0.7,   // low carbon meal
    vegan: 0.4        // ultra low carbon meal
  },
  shopping: {
    electronics: 18.0, // high impact purchase
    clothing: 8.5,     // fast fashion average
    household: 3.2,    // standard items
    groceries: 1.1     // local grocery bag
  }
};

// Initial Activity Logs
export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    timestamp: "2026-06-15T08:30:00Z",
    category: "transport",
    label: "35km Commute via Single Passenger Gas Car",
    value: 35,
    carbonAmount: 7.35 // 35 * 0.21
  },
  {
    id: "act-2",
    timestamp: "2026-06-15T13:00:00Z",
    category: "food",
    label: "Gourmet Beef Burger Lunch",
    value: 1,
    carbonAmount: 7.40
  },
  {
    id: "act-3",
    timestamp: "2026-06-14T19:00:00Z",
    category: "electricity",
    label: "Daily Home HVAC & Utility Load (Standard Grid)",
    value: 18,
    carbonAmount: 7.02 // 18 * 0.39
  },
  {
    id: "act-4",
    timestamp: "2026-06-13T11:20:00Z",
    category: "shopping",
    label: "Polyester Fast-Fashion Jacket",
    value: 1,
    carbonAmount: 8.50
  },
  {
    id: "act-5",
    timestamp: "2026-06-12T09:00:00Z",
    category: "transport",
    label: "40km Weekend Inter-city Train Travel",
    value: 40,
    carbonAmount: 2.00 // 40 * 0.05
  },
  {
    id: "act-6",
    timestamp: "2026-06-11T12:00:00Z",
    category: "food",
    label: "Vegan Buddha Bowl Lunch",
    value: 1,
    carbonAmount: 0.40
  }
];

// Initial Goals
export const INITIAL_GOALS: Goal[] = [
  {
    id: "goal-1",
    title: "Cut transport carbon below 80 kg",
    category: "transport",
    targetKg: 80,
    currentKg: 65,
    deadline: "2026-06-30",
    isCompleted: false
  },
  {
    id: "goal-2",
    title: "Optimize household HVAC cycles",
    category: "electricity",
    targetKg: 40,
    currentKg: 28,
    deadline: "2026-06-25",
    isCompleted: false
  },
  {
    id: "goal-3",
    title: "Log 10 plant-based vegan meals",
    category: "food",
    targetKg: 10,
    currentKg: 8,
    deadline: "2026-06-20",
    isCompleted: false
  }
];

// Initial Badge Achievements
export const INITIAL_BADGES: Badge[] = [
  {
    id: "badge-1",
    title: "Zero Commute Hero",
    description: "Swapped standard vehicle commute with walking or biking 5 times.",
    unlockedAt: "2026-06-10T15:40:00Z",
    iconName: "Bike",
    colorClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
  },
  {
    id: "badge-2",
    title: "Botanical Chef",
    description: "Logged 15 plant-based meals in a single billing period.",
    unlockedAt: "2026-06-14T19:30:00Z",
    iconName: "Leaf",
    colorClass: "bg-teal-500/10 text-teal-500 border-teal-500/20"
  },
  {
    id: "badge-3",
    title: "Power Miser",
    description: "Kept home electricity emissions 20% below standard city average.",
    unlockedAt: null,
    iconName: "Zap",
    colorClass: "bg-slate-500/10 text-slate-400 border-slate-500/10"
  },
  {
    id: "badge-4",
    title: "Conscious Wardrobe",
    description: "Avoided buying any high-impact synthetic apparel for 30 consecutive days.",
    unlockedAt: null,
    iconName: "ShoppingBag",
    colorClass: "bg-slate-500/10 text-slate-400 border-slate-500/10"
  }
];

// Community Challenge info
export const ECO_CHALLENGE: CommunityChallenge = {
  id: "ch-1",
  title: "Metro Clean Streets Rally",
  description: "Our community of EcoTrackers is aiming to save 20,000 kg of carbon collectively before summer concludes.",
  targetTotalSaved: 20000,
  currentSaved: 14850,
  daysRemaining: 14,
  participants: 412
};

// Default dynamic tips
export const DYNAMIC_TIPS = [
  "Lower your hot water heater temperature to 120°F (49°C). This simple dial turn keeps water heat safe, reduces standby utility bills by 5-10%, and cuts carbon emissions.",
  "Replacing just one beef meal with an organic vegetarian dinner saves about 6.7kg of direct greenhouse gaseous release—equivalent to charging a smartphone 800 times.",
  "Driving at 50 mph instead of 70 mph improves vehicle fuel economy by 15-20%, which translates directly into lower fuel costs and matching emission offsets.",
  "Wash laundry cycles in cold water. In most household devices, roughly 90% of electricity is used solely to heat water."
];
