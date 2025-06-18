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
      p.setVar("samReloadTime", p.getVar("samReloadTime") - 40);
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
    description: "Pop growth +2.5%. Troop recovery +2%. (Per Hospital).",
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
    description: "Pop growth +3%. Troop recovery +2.5%. Max hospitals: 4.",
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
    description: "Pop growth +4%. Troop recovery +4%. Max hospitals: 5.",
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
  // Radar Techs
  {
    id: "radarRange1",
    name: "Extended Dish Array",
    description: "Upgraded antennas boost radar range by 25%.",
    icon: "📡",
    category: "Radar",
    cost: 500_000,
    apply: (p) => {
      p.setVar("radarRange", Math.floor(p.getVar("radarRange") * 1.25));
    },
  },
  {
    id: "radarTarget1",
    name: "Signal Processing Suite",
    description: "Improved filters increase targeting bonus by 10%.",
    icon: "🛰️",
    category: "Radar",
    cost: 1_000_000,
    apply: (p) => {
      p.setVar("radarTargetingBonus", p.getVar("radarTargetingBonus") + 10);
    },
  },
  {
    id: "radarRange2",
    name: "High-Gain Transceiver",
    description: "Advanced electronics boost radar range by another 30%.",
    icon: "🔭",
    category: "Radar",
    cost: 1_200_000,
    apply: (p) => {
      p.setVar("radarRange", Math.floor(p.getVar("radarRange") * 1.3));
    },
  },
  {
    id: "radarTarget2",
    name: "AI-Assisted Tracking",
    description:
      "Machine-learning algorithms further increase targeting bonus by 15%.",
    icon: "🤖",
    category: "Radar",
    cost: 2_500_000,
    apply: (p) => {
      p.setVar("radarTargetingBonus", p.getVar("radarTargetingBonus") + 15);
    },
  },
  // Missile Techs
  {
    id: "cruiseEvasion1",
    name: "Chaff Dispersion System",
    description:
      "Deploy chaff during flight to improve cruise missile evasion by +8%.",
    icon: "🎐",
    category: "Missiles",
    cost: 1_000_000,
    apply: (p) => {
      p.setVar("cruiseEvasion", p.getVar("cruiseEvasion") + 8);
    },
  },
  {
    id: "atomicEvasion1",
    name: "Radiation Hardening",
    description: "Shielding upgrades boost atomic missile evasion by +5%.",
    icon: "☢️",
    category: "Missiles",
    cost: 2_500_000,
    apply: (p) => {
      p.setVar("atomEvasion", p.getVar("atomEvasion") + 5);
    },
  },
  {
    id: "missilesEvasionAll1",
    name: "Adaptive Countermeasures",
    description: "Integrated ECM boosts evasion of all missile types by +5%.",
    icon: "🛡️",
    category: "Missiles",
    cost: 3_500_000,
    apply: (p) => {
      p.setVar("cruiseEvasion", p.getVar("cruiseEvasion") + 5);
      p.setVar("atomEvasion", p.getVar("atomEvasion") + 5);
      p.setVar("hydrogenEvasion", p.getVar("hydrogenEvasion") + 5);
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
