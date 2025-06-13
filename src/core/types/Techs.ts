// src/core/types/Techs.ts

import { Player } from "../game/Game";

export type Tech = {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or emoji for now
  unlocked?: boolean;
  category: string;
  cost: number; // Add cost field (in gold)
  apply: (player: Player) => void;
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
    name: "Rapid Reload Protocol",
    description: "Crew drills cut reload time by 5 seconds.",
    icon: "⏱️",
    category: "Sams",
    cost: 300_000,
    apply: (p) => {
      p.setVar("samReloadTime", p.getVar("samReloadTime") - 50);
    },
  },
  {
    id: "samRange1",
    name: "Extended Tracking Array",
    description: "Chemical reformulation boosts interceptor range by 25%.",
    icon: "📡",
    category: "Sams",
    cost: 800_000,
    apply: (p) => {
      p.setVar("samSearchRange", Math.floor(p.getVar("samSearchRange") * 1.25));
    },
  },
  {
    id: "samSpeed1",
    name: "Hyper-Combustion Fuel",
    description: "Solid additives increase interceptor speed by 33%.",
    icon: "⚡",
    category: "Sams",
    cost: 1_250_000,
    apply: (p) => {
      p.setVar(
        "samMissileSpeed",
        Math.floor(p.getVar("samMissileSpeed") * 1.33),
      );
    },
  },
  {
    id: "samInterceptor1",
    name: "Mass Interceptor Production",
    description: "Factory upgrades allow +1 interceptor per launcher.",
    icon: "➕",
    category: "Sams",
    cost: 4_000_000,
    apply: (p) => {
      p.setVar("samInterceptors", p.getVar("samInterceptors") + 1);
    },
  },
  // Hospital Techs
  {
    id: "hospitalBonus1",
    name: "Advanced Care Protocols",
    description:
      "Increase pop-growth bonus to 2.5% and troop trickleback to 2% per hospital.",
    icon: "🏥",
    category: "Hospitals",
    cost: 500_000,
    apply: (p) => {
      p.setVar("hospitalBonusPopulationGrowth", 2.5);
      p.setVar("hospitalBonusTroopTrickleback", 2);
      // hospitalMaxNumber remains at base (4)
    },
  },
  {
    id: "hospitalBonus2",
    name: "Medical Supply Innovations",
    description:
      "Increase pop-growth bonus to 3% and troop trickleback to 2.5% per hospital; expand hospital cap to 4.",
    icon: "💊",
    category: "Hospitals",
    cost: 1_200_000,
    apply: (p) => {
      p.setVar("hospitalBonusPopulationGrowth", 3);
      p.setVar("hospitalBonusTroopTrickleback", 2.5);
      p.setVar("hospitalMaxNumber", 4);
    },
  },
  {
    id: "hospitalBonus3",
    name: "Mobile Field Units",
    description:
      "Increase pop-growth bonus to 3.5% and troop trickleback to 3% per hospital.",
    icon: "🚑",
    category: "Hospitals",
    cost: 2_000_000,
    apply: (p) => {
      p.setVar("hospitalBonusPopulationGrowth", 3.5);
      p.setVar("hospitalBonusTroopTrickleback", 3);
      // hospitalMaxNumber remains at 4
    },
  },
  {
    id: "hospitalBonus4",
    name: "Advanced Bio-Engineering",
    description:
      "Increase pop-growth bonus to 4% and troop trickleback to 4% per hospital; expand hospital cap to 5.",
    icon: "🧬",
    category: "Hospitals",
    cost: 4_000_000,
    apply: (p) => {
      p.setVar("hospitalBonusPopulationGrowth", 4);
      p.setVar("hospitalBonusTroopTrickleback", 4);
      p.setVar("hospitalMaxNumber", 5);
    },
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
