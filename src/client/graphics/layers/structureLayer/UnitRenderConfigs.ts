import barracksIcon from "../../../../resources/images/buildings/barracks.webp";
import cityIcon from "../../../../resources/images/buildings/cityAlt1.png";
import shieldIcon from "../../../../resources/images/buildings/fortAlt2.png";
import hospitalIcon from "../../../../resources/images/buildings/hospital.png";
import anchorIcon from "../../../../resources/images/buildings/port1.png";
import powerPlantIcon from "../../../../resources/images/buildings/powerPlant.webp";
import researchLabIcon from "../../../../resources/images/buildings/researchLab.webp";
import MissileSiloReloadingIcon from "../../../../resources/images/buildings/silo1-reloading.png";
import missileSiloIcon from "../../../../resources/images/buildings/silo1.png";
import SAMMissileReloadingIcon from "../../../../resources/images/buildings/silo4-reloading.png";
import SAMMissileIcon from "../../../../resources/images/buildings/silo4.png";

import { UnitType } from "../../../../core/game/Game";

export enum UnitBorderType {
  Round,
  Diamond,
  Square,
  Hexagon,
}

export interface UnitRenderConfig {
  icon: string;
  borderRadius: number;
  territoryRadius: number;
  borderType: UnitBorderType;
}

export const unitConfigs: Partial<Record<UnitType, UnitRenderConfig>> = {
  [UnitType.Port]: {
    icon: anchorIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Round,
  },
  [UnitType.City]: {
    icon: cityIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Round,
  },
  [UnitType.MissileSilo]: {
    icon: missileSiloIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Square,
  },
  [UnitType.DefensePost]: {
    icon: shieldIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Hexagon,
  },
  [UnitType.Barracks]: {
    icon: barracksIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Hexagon,
  },
  [UnitType.SAMLauncher]: {
    icon: SAMMissileIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Square,
  },
  [UnitType.ResearchLab]: {
    icon: researchLabIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Round,
  },
  [UnitType.Hospital]: {
    icon: hospitalIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Round,
  },
  [UnitType.PowerPlant]: {
    icon: powerPlantIcon,
    borderRadius: 8.525,
    territoryRadius: 6.525,
    borderType: UnitBorderType.Round,
  },
};

// Also export reloading icons if needed externally
export const reloadingIcons = {
  reloadingSilo: MissileSiloReloadingIcon,
  reloadingSam: SAMMissileReloadingIcon,
};
