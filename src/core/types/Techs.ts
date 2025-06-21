// src/core/types/Techs.ts

import { Player } from "../game/Game";

export type Tech = {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or emoji for now
  unlocked?: boolean;
  category: string;
  minorCategory?: string;
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
    description: "Interceptor speed  +33%. Interceptors +1.",
    icon: "⚡",
    category: "Sams",
    cost: 1_250_000,
    apply: (p) => {
      p.setVar(
        "samMissileSpeed",
        Math.floor(p.getVar("samMissileSpeed") * 1.33),
      );
      p.setVar("samInterceptors", p.getVar("samInterceptors") + 1);
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
    category: "Civilian",
    minorCategory: "Hospitals",
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
    category: "Civilian",
    minorCategory: "Hospitals",
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
    description: "Pop growth +3.5%. Troop recovery +3%.",
    icon: "🚑",
    category: "Civilian",
    minorCategory: "Hospitals",
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
    description: "Pop growth +4%. Troop recovery +4%. Max hospitals: 5.",
    icon: "🧬",
    category: "Civilian",
    minorCategory: "Hospitals",
    cost: 4_000_000,
    apply: (p) => {
      p.setVar("hospitalBonusPopulationGrowth", 4);
      p.setVar("hospitalBonusTroopTrickleback", 4);
      p.setVar("hospitalMaxNumber", 5);
    },
  },
  // Metro Tech
  {
    id: "metros",
    name: "Metropolitan Design",
    description:
      "Unlocks Metropolises, massive cities with advanced infrastructure.",
    icon: "🏙️",
    category: "Civilian",
    minorCategory: "Cities",
    cost: 2_500_000,
    apply: (p) => {},
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
  // Power Plant
  {
    id: "powerPlant1",
    name: "High-Efficiency Turbines",
    description: "Gold +400 per plant.",
    icon: "⚡",
    category: "Power",
    cost: 900_000,
    apply: (p) => {
      p.setVar(
        "powerPlantGoldGeneration",
        p.getVar("powerPlantGoldGeneration") + 50,
      );
    },
  },
  {
    id: "powerPlant2",
    name: "Automated Silos",
    description: "Store +5 materials, max plants: 4.",
    icon: "🏭",
    category: "Power",
    cost: 1_400_000,
    apply: (p) => {
      p.setVar(
        "powerPlantMaterialGenerationMax",
        p.getVar("powerPlantMaterialGenerationMax") + 5,
      );
      p.setVar("powerPlantMaxNumber", 4);
    },
  },
  {
    id: "powerPlant3",
    name: "Advanced Power Cycle",
    description: "Gold +600, materials +1/cycle per plant.",
    icon: "💡",
    category: "Power",
    cost: 2_000_000,
    apply: (p) => {
      p.setVar(
        "powerPlantGoldGeneration",
        p.getVar("powerPlantGoldGeneration") + 80,
      );
      p.setVar(
        "powerPlantMaterialGenerationRate",
        p.getVar("powerPlantMaterialGenerationRate") + 1,
      );
    },
  },
  {
    id: "powerPlant4",
    name: "National Grid",
    description:
      "Store +5 materials, max plants: 5, materials +1/cycle per plant.",
    icon: "🌐",
    category: "Power",
    cost: 2_800_000,
    apply: (p) => {
      p.setVar(
        "powerPlantMaterialGenerationMax",
        p.getVar("powerPlantMaterialGenerationMax") + 5,
      );
      p.setVar(
        "powerPlantMaterialGenerationRate",
        p.getVar("powerPlantMaterialGenerationRate") + 1,
      );
      p.setVar("powerPlantMaxNumber", 5);
    },
  },
  // Naval
  {
    id: "navalOps1",
    name: "Fleet Interceptor Retrofit",
    description: "Warships gain a missile interceptor.",
    icon: "🛡️",
    category: "Naval",
    cost: 1_200_000,
    apply: (p) => {
      p.setVar("warshipMaxInterceptors", 1);
    },
  },
  {
    id: "navalOps2",
    name: "Amphibious Expansion",
    description: "Naval invasions: 4. Interceptor range +40.",
    icon: "⚓",
    category: "Naval",
    cost: 1_500_000,
    apply: (p) => {
      p.setVar("navalInvasionMaxCount", 4);
      p.setVar(
        "warshipMaxInterceptorRange",
        p.getVar("warshipMaxInterceptorRange") + 40,
      );
    },
  },
  {
    id: "navalOps3",
    name: "Integrated Air Defense",
    description: "Warships: 2 interceptors, range +40.",
    icon: "🚢",
    category: "Naval",
    cost: 1_700_000,
    apply: (p) => {
      p.setVar("warshipMaxInterceptors", 2);
      p.setVar(
        "warshipMaxInterceptorRange",
        p.getVar("warshipMaxInterceptorRange") + 40,
      );
    },
  },
  {
    id: "navalOps4",
    name: "Global Naval Command",
    description: "Naval invasions: 5.",
    icon: "🌊",
    category: "Naval",
    cost: 2_400_000,
    apply: (p) => {
      p.setVar("navalInvasionMaxCount", 5);
    },
  },
  //Silos
  {
    id: "siloTech1",
    name: "Servo-Assisted Reload",
    description: "Reload time -10%.",
    icon: "⏱️",
    category: "Silos",
    cost: 700_000,
    apply: (p) => {
      p.setVar(
        "missileSiloTubeRegenTime",
        Math.floor(p.getVar("missileSiloTubeRegenTime") * 0.9),
      );
    },
  },
  {
    id: "siloTech2",
    name: "Secondary Launch Tube",
    description: "Silos: 2 tubes. Silo cost cap: $1.3M.",
    icon: "🚀",
    category: "Silos",
    cost: 1_200_000,
    apply: (p) => {
      p.setVar("missileSiloTubes", 2);
      p.setVar("missileSiloMaxCost", 1_300_000);
    },
  },
  {
    id: "siloTech3",
    name: "Pneumatic Feed System",
    description: "Reload time -10%.",
    icon: "🔧",
    category: "Silos",
    cost: 1_700_000,
    apply: (p) => {
      p.setVar(
        "missileSiloTubeRegenTime",
        Math.floor(p.getVar("missileSiloTubeRegenTime") * 0.9),
      );
    },
  },
  {
    id: "siloTech4",
    name: "Hardened Launch Bays",
    description: "Missile cost cap: $1.6M. Reload time -10%.",
    icon: "🏗️",
    category: "Silos",
    cost: 2_300_000,
    apply: (p) => {
      p.setVar("missileSiloMaxCost", 1_600_000);
      p.setVar(
        "missileSiloTubeRegenTime",
        Math.floor(p.getVar("missileSiloTubeRegenTime") * 0.9),
      );
    },
  },
];

// Group techs by category, then by minorCategory (default "General")
export function groupTechsByCategoryForUI(techs: Tech[]) {
  const categories = Array.from(new Set(techs.map((t) => t.category)));
  return categories.map((cat) => {
    const items = techs.filter((t) => t.category === cat);
    // group by minorCategory
    const minorCats = Array.from(
      new Set(items.map((t) => t.minorCategory || "General")),
    );
    return {
      category: cat,
      rows: minorCats.map((minCat) => ({
        minorCategory: minCat,
        techs: items.filter((t) => (t.minorCategory || "General") === minCat),
      })),
    };
  });
}

export const researchTree = groupTechsByCategoryForUI(techList);

export default researchTree;
