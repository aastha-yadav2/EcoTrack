import React, { useState } from "react";
import { Plus, Bike, Zap, Flame, ShoppingBag, Eye, HelpCircle } from "lucide-react";
import { Activity } from "../types";
import { CARBON_FACTORS } from "../data";

interface ActivityLoggerProps {
  onAddActivity: (activity: Omit<Activity, "id" | "timestamp">) => void;
  isDark: boolean;
}

export const ActivityLogger: React.FC<ActivityLoggerProps> = ({ onAddActivity, isDark }) => {
  const [activeTab, setActiveTab] = useState<"transport" | "electricity" | "food" | "shopping">("transport");
  
  // Transport Sub-state
  const [distance, setDistance] = useState("15");
  const [vehicleType, setVehicleType] = useState<keyof typeof CARBON_FACTORS.transport>("gas_car");
  
  // Electricity Sub-state
  const [kwh, setKwh] = useState("10");
  const [gridType, setGridType] = useState<keyof typeof CARBON_FACTORS.electricity>("grid_standard");
  
  // Food Sub-state
  const [mealCount, setMealCount] = useState("1");
  const [mealType, setMealType] = useState<keyof typeof CARBON_FACTORS.food>("beef_lamb");
  
  // Shopping Sub-state
  const [purchaseType, setPurchaseType] = useState<keyof typeof CARBON_FACTORS.shopping>("electronics");
  const [itemsCount, setItemsCount] = useState("1");

  // Status message
  const [successMsg, setSuccessMsg] = useState("");

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    let label = "";
    let value = 0;
    let carbonAmount = 0;

    if (activeTab === "transport") {
      const distNum = parseFloat(distance) || 0;
      if (distNum <= 0) return;
      const factor = CARBON_FACTORS.transport[vehicleType];
      carbonAmount = distNum * factor;
      value = distNum;
      
      const vehicleNames = {
        gas_car: "Gasoline Car",
        hybrid_car: "Hybrid Vehicle",
        ev: "Electric Vehicle (EV)",
        transit: "Metro Transit / Rail",
        bike_walk: "Bicycle or Footwalk"
      };
      label = `${distNum}km Commute via ${vehicleNames[vehicleType]}`;
    } else if (activeTab === "electricity") {
      const kwhNum = parseFloat(kwh) || 0;
      if (kwhNum <= 0) return;
      const factor = CARBON_FACTORS.electricity[gridType];
      carbonAmount = kwhNum * factor;
      value = kwhNum;

      const gridNames = {
        grid_standard: "Standard Local Grid",
        grid_smart: "Smart Peak-Optimized Grid",
        solar_renew: "Self-Sourced Rooftop Solar"
      };
      label = `Electricity consumption (${kwhNum} kWh) on ${gridNames[gridType]}`;
    } else if (activeTab === "food") {
      const mealsNum = parseInt(mealCount) || 0;
      if (mealsNum <= 0) return;
      const factor = CARBON_FACTORS.food[mealType];
      carbonAmount = mealsNum * factor;
      value = mealsNum;

      const foodNames = {
        beef_lamb: "Gourmet Red Meat Meal (Beef/Lamb)",
        poultry_fish: "Poultry or Seafaring Fish Meal",
        vegetarian: "Egg-Dairy Vegetarian Dish",
        vegan: "100% Plant-Based Vegan Meal"
      };
      label = `${mealsNum}x ${foodNames[mealType]}`;
    } else if (activeTab === "shopping") {
      const qtyNum = parseInt(itemsCount) || 0;
      if (qtyNum <= 0) return;
      const factor = CARBON_FACTORS.shopping[purchaseType];
      carbonAmount = qtyNum * factor;
      value = qtyNum;

      const shopNames = {
        electronics: "Commercial Electronics Hardware Device",
        clothing: "Apparel Piece / Synthetic Fiber Product",
        household: "Standard Synthetic Household Utensil",
        groceries: "Local organic paper-bag grocery load"
      };
      label = `Purchased ${qtyNum}x ${shopNames[purchaseType]}`;
    }

    onAddActivity({
      category: activeTab,
      label,
      value,
      carbonAmount: parseFloat(carbonAmount.toFixed(2))
    });

    // Reset simple success feedback
    setSuccessMsg(`Log entry added: -${carbonAmount.toFixed(1)} kg impact recorded`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const tabs = [
    { id: "transport", title: "Transport", icon: Bike, desc: "Commute offsets" },
    { id: "electricity", title: "Electricity", icon: Zap, desc: "Utility consumption" },
    { id: "food", title: "Food Intake", icon: Flame, desc: "Meal footprints" },
    { id: "shopping", title: "Shopping", icon: ShoppingBag, desc: "Direct consumer acquisitions" }
  ];

  return (
    <div
      className={`rounded-2xl p-5 border h-full transition-colors flex flex-col ${
        isDark
          ? "bg-slate-900/35 border-slate-800 text-slate-100"
          : "bg-white/60 border-slate-200/80 text-slate-900"
      } backdrop-blur-md`}
      id="activity-logger-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-base tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Log New Carbon Event
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Log items real-time to compute automatic offsets
          </p>
        </div>
        <Plus className="w-5 h-5 text-emerald-500" />
      </div>

      {/* Tabs list with comfortable touch targets */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              onClick={() => {
                setActiveTab(tab.id as any);
                setSuccessMsg("");
              }}
              key={tab.id}
              aria-label={`Log ${tab.title}`}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all min-h-[50px] outline-none border focus:ring-1 focus:ring-emerald-500 ${
                isActive
                  ? "bg-white dark:bg-slate-800 shadow-sm border-slate-200/80 dark:border-slate-700 text-emerald-500"
                  : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-sans font-medium mt-1">{tab.title}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleLog} className="flex-1 flex flex-col gap-4">
        {/* Tab 1: Transport commute entry inputs */}
        {activeTab === "transport" && (
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vehicle-type" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Transport Mode
              </label>
              <select
                id="vehicle-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/70"
              >
                <option value="gas_car">Standard Gasoline Sedan (210g/km)</option>
                <option value="hybrid_car">Hybrid Vehicle (110g/km)</option>
                <option value="ev">Electric Vehicle (40g/km)</option>
                <option value="transit">Metro Subway or Commuter Rail (50g/km)</option>
                <option value="bike_walk">Cycling, Running or Walking (0g/km)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="distance-input" className="font-medium text-slate-500 dark:text-slate-400">
                  Travel Distance
                </label>
                <span className="font-mono text-emerald-500 font-semibold">{distance} km</span>
              </div>
              <input
                id="distance-input"
                type="range"
                min="1"
                max="100"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <input
                type="number"
                min="1"
                max="500"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Or type distance in km..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 text-xs mt-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Electricity inputs */}
        {activeTab === "electricity" && (
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="grid-type" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Grid Power Source
              </label>
              <select
                id="grid-type"
                value={gridType}
                onChange={(e) => setGridType(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/70"
              >
                <option value="grid_standard">Standard Regional Coal/Gas Grid (390g/kWh)</option>
                <option value="grid_smart">Time-of-Use Optimized Grid (220g/kWh)</option>
                <option value="solar_renew">Rooftop Solar & Local Wind Offsets (20g/kWh)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="power-input" className="font-medium text-slate-500 dark:text-slate-400">
                  Utility Power Used
                </label>
                <span className="font-mono text-emerald-500 font-semibold">{kwh} kWh</span>
              </div>
              <input
                id="power-input"
                type="range"
                min="1"
                max="50"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <input
                type="number"
                min="1"
                max="200"
                value={kwh}
                onChange={(e) => setKwh(e.target.value)}
                placeholder="Or type manual kWh..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 text-xs mt-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Food meal entries */}
        {activeTab === "food" && (
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meal-type" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Dietary Composition
              </label>
              <select
                id="meal-type"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/70"
              >
                <option value="beef_lamb">Beef or Lamb Red Meat Main (7.4kg CO2e)</option>
                <option value="poultry_fish">Poultry, Eggs or Fish Main (2.3kg CO2e)</option>
                <option value="vegetarian">Vegetarian Cheese/Dairy Meal (0.7kg CO2e)</option>
                <option value="vegan">100% Wholesome Vegan Alternative (0.4kg CO2e)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meal-count" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Portion Servings
              </label>
              <input
                id="meal-count"
                type="number"
                min="1"
                max="10"
                value={mealCount}
                onChange={(e) => setMealCount(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Shopping additions */}
        {activeTab === "shopping" && (
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="purchase-type" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Aquired Item Group
              </label>
              <select
                id="purchase-type"
                value={purchaseType}
                onChange={(e) => setPurchaseType(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/70"
              >
                <option value="electronics">Electronics/Tech Hardware (18.0kg CO2e)</option>
                <option value="clothing">New Apparel or Clothing Segment (8.5kg CO2e)</option>
                <option value="household">Household Decor or Utilities (3.2kg CO2e)</option>
                <option value="groceries">Large Bag Grocery Purchase (1.1kg CO2e)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="items-count" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Item Quantity
              </label>
              <input
                id="items-count"
                type="number"
                min="1"
                max="10"
                value={itemsCount}
                onChange={(e) => setItemsCount(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* Success / informative text log */}
        {successMsg && (
          <div className="text-xs text-center py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-fade-in font-medium">
            {successMsg}
          </div>
        )}

        {/* Log Activity Action Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all duration-300 text-xs font-semibold text-white shadow-lg glow-btn-emerald flex items-center justify-center gap-1.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Plus className="w-4 h-4" />
          Log This Activity
        </button>
      </form>
    </div>
  );
};
