// src/core/execution/utils/UnitsUtils.ts

import { UnitType } from "../../game/Game";

export default function isNonStructure(unitType: UnitType): boolean {
  return [
    UnitType.CruiseMissile,
    UnitType.AtomBomb,
    UnitType.HydrogenBomb,
    UnitType.MIRV,
    UnitType.Warship,
  ].includes(unitType);
}
