export interface Activity {
  id: string;
  timestamp: string; // ISO String
  category: "transport" | "electricity" | "food" | "shopping";
  label: string; // e.g. "50km commute", "Electricity Bill", "Vegetarian Dinner"
  value: number; // custom amount (km, kWh, meals, $)
  carbonAmount: number; // calculated emissions (kg CO2e)
}

export interface Goal {
  id: string;
  title: string;
  category: "transport" | "electricity" | "food" | "shopping" | "general";
  targetKg: number;
  currentKg: number;
  deadline: string;
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null; // ISO String or null if locked
  iconName: string;
  colorClass: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  targetTotalSaved: number;
  currentSaved: number;
  daysRemaining: number;
  participants: number;
}

export interface AIInsight {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  content: string;
  impact: string;
}

export interface SustainabilityProfile {
  totalEmissionsThisMonth: number;
  carbonSavedThisMonth: number;
  sustainabilityScore: number;
  goalProgress: number;
  streakCount: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}
