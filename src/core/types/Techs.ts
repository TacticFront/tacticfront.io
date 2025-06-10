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

export const techList: Tech[] = [
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
    cost: 1000,
  },
  {
    id: "missile3",
    name: "Guided Missiles",
    description: "Missiles are more accurate.",
    icon: "🎯",
    category: "Missile",
    cost: 2000,
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
    cost: 800,
  },
  {
    id: "eco3",
    name: "Trade Agreements",
    description: "Gold generation +15%.",
    icon: "🤝",
    category: "Economy",
    cost: 1800,
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
    cost: 1200,
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
