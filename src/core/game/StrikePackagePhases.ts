// src/core/game/StrikePackagePhases.ts

import { NukeType } from "../StatsSchemas";
import { UnitType } from "./Game";
import { StrikePackageType } from "./StrikePackageType";

export const strikePackagePhases: {
  [K in StrikePackageType]: Array<{
    name: string;
    missileType: NukeType;
    targetTypes: UnitType[];
    overkill?: number;
    launchDecoys?: boolean;
  }>;
} = {
  [StrikePackageType.MilitaryStrike]: [
    {
      name: "Interceptor Suppression",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.SAMLauncher],
      overkill: 3,
    },
    {
      name: "Silo Strike",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.MissileSilo],
      overkill: 2,
    },
    {
      name: "Defense Post Strike",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.DefensePost],
      overkill: 2,
    },
  ],
  [StrikePackageType.ScorchedEarth]: [
    {
      name: "Interceptor Suppression",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.SAMLauncher],
      overkill: 3,
    },
    {
      name: "Silo Strike",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.MissileSilo],
      overkill: 2,
    },
    {
      name: "Defense Post Strike",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.DefensePost],
      overkill: 2,
    },
    {
      name: "City Annihilation",
      missileType: UnitType.AtomBomb,
      targetTypes: [UnitType.City],
      overkill: 1,
      launchDecoys: true,
    },
  ],
  [StrikePackageType.CruiseMissile]: [
    {
      name: "Defense Post Strike",
      missileType: UnitType.CruiseMissile,
      targetTypes: [UnitType.DefensePost],
      overkill: 2,
    },
  ],
  [StrikePackageType.AtomBomb]: [
    {
      name: "City Annihilation",
      missileType: UnitType.AtomBomb,
      targetTypes: [UnitType.City],
      overkill: 1,
      launchDecoys: true,
    },
  ],
};
