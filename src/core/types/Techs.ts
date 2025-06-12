// src/core/types/Techs.ts

export type Tech = {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or emoji for now
  unlocked?: boolean;
  category: string;
  cost: number; // Add cost field (in gold)
};

// this._vars.set("samMissileSpeed", 12);
// this._vars.set("samSearchRange", 100);
// this._vars.set("samInterceptors", 1);
// this._vars.set("samReloadTime", 300);
// this._vars.set("cruiseEvasion", 40);
// this._vars.set("atomEvasion", 30);
// this._vars.set("hydrogenEvasion", 25);

export const techList: Tech[] = [
  {
    id: "samReload1",
    name: "Crew Drills",
    description: "Decrease Reload Time by 5 seconds.",
    icon: "⏱️", // stopwatch
    category: "Sams",
    cost: 300_000,
  },
  {
    id: "samRange1",
    name: "Chemical Reformulation",
    description: "Increases Missile Interceptor Range by 25%",
    icon: "📡", // satellite antenna
    category: "Sams",
    cost: 800_000,
  },
  {
    id: "samSpeed1",
    name: "Solid Fuel Additives",
    description: "Increases Interceptor Speed by 33%",
    icon: "⚡", // high voltage
    category: "Sams",
    cost: 1_250_000,
  },
  {
    id: "samInterceptor1",
    name: "More is Better",
    description: "Increase Interceptors by one.",
    icon: "➕", // plus sign
    category: "Sams",
    cost: 4_000_000,
  },
  // Missile Techs
  {
    id: "missile1",
    name: "Basic Missiles",
    description: "Unlocks basic missile units.",
    icon: "🚀",
    category: "Missile",
    cost: 0,
  },
  {
    id: "missile2",
    name: "Faster Missiles",
    description: "Missiles travel 25% faster.",
    icon: "💨",
    category: "Missile",
    cost: 0,
  },
  {
    id: "missile3",
    name: "Guided Missiles",
    description: "Missiles are more accurate.",
    icon: "🎯",
    category: "Missile",
    cost: 0,
  },

  // Economy Techs
  {
    id: "eco1",
    name: "Basic Economy",
    description: "Boosts gold generation by 5%.",
    icon: "💰",
    category: "Economy",
    cost: 0,
  },
  {
    id: "eco2",
    name: "Tax Reform",
    description: "Gold generation +10%.",
    icon: "🪙",
    category: "Economy",
    cost: 0,
  },
  {
    id: "eco3",
    name: "Trade Agreements",
    description: "Gold generation +15%.",
    icon: "🤝",
    category: "Economy",
    cost: 0,
  },

  // Radar Techs
  {
    id: "radar1",
    name: "Improved Radar",
    description: "See incoming attacks sooner.",
    icon: "📡",
    category: "Radar",
    cost: 0,
  },
  {
    id: "radar2",
    name: "Advanced Radar",
    description: "Detect missile types.",
    icon: "🔍",
    category: "Radar",
    cost: 0,
  },
];

export function groupTechsByCategoryForUI(techs: Tech[]): Tech[][] {
  // Get all unique categories in the order they appear
  const categories = Array.from(new Set(techs.map((t) => t.category)));
  // Map each category to its array (preserving original tech order)
  return categories.map((cat) => techs.filter((t) => t.category === cat));
}

export const researchTree = groupTechsByCategoryForUI(techList);

export default researchTree;
