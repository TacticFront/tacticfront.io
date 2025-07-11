// src/client/graphics/layers/BuildMenu.ts

import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import warshipIcon from "../../../../resources/images/BattleshipIconWhite.svg";
import barracksIcon from "../../../../resources/images/buildings/barracks.png";
import hospitalIcon from "../../../../resources/images/buildings/hospital.png";
import radarIcon from "../../../../resources/images/buildings/radar.png";
import researchLabIcon from "../../../../resources/images/buildings/researchLab.png";
import townIcon from "../../../../resources/images/buildings/town.png";
import cityIcon from "../../../../resources/images/CityIconWhite.svg";
import goldCoinIcon from "../../../../resources/images/GoldCoinIcon.svg";
import mirvIcon from "../../../../resources/images/MIRVIcon.svg";
import missileSiloIcon from "../../../../resources/images/MissileSiloIconWhite.svg";
import hydrogenBombIcon from "../../../../resources/images/MushroomCloudIconWhite.svg";
import atomBombIcon from "../../../../resources/images/NukeIconWhite.svg";
import portIcon from "../../../../resources/images/PortIcon.svg";
import powerPlantIcon from "../../../../resources/images/PowerPlantIcon.svg";
import samlauncherIcon from "../../../../resources/images/SamLauncherIconWhite.svg";
import shieldIcon from "../../../../resources/images/ShieldIconWhite.svg";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Cell, Gold, PlayerActions, UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { BuildUnitIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

interface BuildItemDisplay {
  unitType: UnitType;
  icon: string;
  description?: string;
  key?: string;
  countable?: boolean;
  minTechLevel?: number;
  nuclear?: boolean;
}

const buildTable: BuildItemDisplay[][] = [
  [
    {
      unitType: UnitType.CruiseMissile,
      icon: atomBombIcon,
      description: "build_menu.desc.cruise_missile",
      key: "unit_type.cruise_missile",
      countable: false,
      minTechLevel: 1,
    },
    {
      unitType: UnitType.AtomBomb,
      icon: atomBombIcon,
      description: "build_menu.desc.atom_bomb",
      key: "unit_type.atom_bomb",
      countable: false,
      minTechLevel: 3,
      nuclear: true,
    },
    {
      unitType: UnitType.HydrogenBomb,
      icon: hydrogenBombIcon,
      description: "build_menu.desc.hydrogen_bomb",
      key: "unit_type.hydrogen_bomb",
      countable: false,
      minTechLevel: 4,
      nuclear: true,
    },
    {
      unitType: UnitType.MIRV,
      icon: mirvIcon,
      description: "build_menu.desc.mirv",
      key: "unit_type.mirv",
      countable: false,
      minTechLevel: 5,
      nuclear: true,
    },
    {
      unitType: UnitType.Warship,
      icon: warshipIcon,
      description: "build_menu.desc.warship",
      key: "unit_type.warship",
      countable: true,
      minTechLevel: 2,
    },
    {
      unitType: UnitType.Port,
      icon: portIcon,
      description: "build_menu.desc.port",
      key: "unit_type.port",
      countable: true,
    },
    {
      unitType: UnitType.MissileSilo,
      icon: missileSiloIcon,
      description: "build_menu.desc.missile_silo",
      key: "unit_type.missile_silo",
      countable: true,
      minTechLevel: 1,
    },
    {
      unitType: UnitType.Radar,
      icon: radarIcon,
      description: "build_menu.desc.radar",
      key: "unit_type.radar",
      countable: true,
      minTechLevel: 3,
    },
    // needs new icon
    {
      unitType: UnitType.SAMLauncher,
      icon: samlauncherIcon,
      description: "build_menu.desc.sam_launcher",
      key: "unit_type.sam_launcher",
      countable: true,
      minTechLevel: 2,
    },
    {
      unitType: UnitType.DefensePost,
      icon: shieldIcon,
      description: "build_menu.desc.defense_post",
      key: "unit_type.defense_post",
      countable: true,
    },
    {
      unitType: UnitType.Barracks,
      icon: barracksIcon,
      description: "build_menu.desc.barracks",
      key: "unit_type.barracks",
      countable: true,
    },
    {
      unitType: UnitType.City,
      icon: townIcon,
      description: "build_menu.desc.city",
      key: "unit_type.city",
      countable: true,
    },
    {
      unitType: UnitType.Metropolis,
      icon: cityIcon,
      description: "build_menu.desc.metropolis",
      key: "unit_type.metropolis",
      minTechLevel: 2,
      countable: true,
    },
    {
      unitType: UnitType.ResearchLab,
      icon: researchLabIcon,
      description: "build_menu.desc.research_lab",
      key: "unit_type.research_lab",
      countable: true,
    },
    {
      unitType: UnitType.Hospital,
      icon: hospitalIcon,
      description: "build_menu.desc.hospital",
      key: "unit_type.hospital",
      countable: true,
      minTechLevel: 2,
    },
    {
      unitType: UnitType.PowerPlant,
      icon: powerPlantIcon,
      description: "build_menu.desc.power_plant",
      key: "unit_type.power_plant",
      countable: true,
      minTechLevel: 2,
    },
  ],
];

@customElement("build-menu")
export class BuildMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  private clickedTile: TileRef;
  private playerActions: PlayerActions | null;
  private filteredBuildTable: BuildItemDisplay[][] = buildTable;

  tick() {
    if (!this._hidden) {
      this.refresh();
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .build-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background-color: #1e1e1e;
      padding: 15px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 95vw;
      max-height: 95vh;
      overflow-y: auto;
    }
    .build-description {
      font-size: 0.6rem;
    }
    .build-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
    }
    .build-button {
      position: relative;
      width: 120px;
      height: 140px;
      border: 2px solid #444;
      background-color: #2c2c2c;
      color: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 8px;
      padding: 10px;
      gap: 5px;
    }
    .build-button:not(:disabled):hover {
      background-color: #3a3a3a;
      transform: scale(1.05);
      border-color: #666;
    }
    .build-button:not(:disabled):active {
      background-color: #4a4a4a;
      transform: scale(0.95);
    }
    .build-button:disabled {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .build-button:disabled img {
      opacity: 0.5;
    }
    .build-button:disabled .build-cost {
      color: #ff4444;
    }
    .build-icon {
      font-size: 40px;
      margin-bottom: 5px;
    }
    .build-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: center;
    }
    .build-cost {
      font-size: 14px;
    }
    .hidden {
      display: none !important;
    }
    .build-count-chip {
      position: absolute;
      top: -10px;
      right: -10px;
      background-color: #2c2c2c;
      color: white;
      padding: 2px 10px;
      border-radius: 10000px;
      transition: all 0.3s ease;
      font-size: 12px;
      display: flex;
      justify-content: center;
      align-content: center;
      border: 1px solid #444;
    }
    .tech-level-chip {
      position: absolute;
      top: -10px;
      left: -10px;
      background-color: #2c2c2c;
      color: white;
      padding: 2px 10px;
      border-radius: 10000px;
      transition: all 0.3s ease;
      font-size: 12px;
      display: flex;
      justify-content: center;
      align-content: center;
      border: 1px solid #444;
    }
    .build-button:not(:disabled):hover > .build-count-chip {
      background-color: #3a3a3a;
      border-color: #666;
    }
    .build-button:not(:disabled):active > .build-count-chip {
      background-color: #4a4a4a;
    }
    .build-button:disabled > .build-count-chip {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
    }
    .build-count {
      font-weight: bold;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .build-menu {
        padding: 10px;
        max-height: 80vh;
        width: 80vw;
      }
      .build-button {
        width: 140px;
        height: 120px;
        margin: 4px;
        padding: 6px;
        gap: 5px;
      }
      .build-icon {
        font-size: 28px;
      }
      .build-name {
        font-size: 12px;
        margin-bottom: 3px;
      }
      .build-cost {
        font-size: 11px;
      }
      .build-count {
        font-weight: bold;
        font-size: 10px;
      }
      .build-count-chip {
        padding: 1px 5px;
      }
    }

    @media (max-width: 480px) {
      .build-menu {
        padding: 8px;
        max-height: 70vh;
      }
      .build-button {
        width: calc(50% - 6px);
        height: 100px;
        margin: 3px;
        padding: 4px;
        border-width: 1px;
      }
      .build-icon {
        font-size: 24px;
      }
      .build-name {
        font-size: 10px;
        margin-bottom: 2px;
      }
      .build-cost {
        font-size: 9px;
      }
      .build-count {
        font-weight: bold;
        font-size: 8px;
      }
      .build-count-chip {
        padding: 0 3px;
      }
      .build-button img {
        width: 24px;
        height: 24px;
      }
      .build-cost img {
        width: 10px;
        height: 10px;
      }
    }
  `;

  @state()
  private _hidden = true;

  public hasRequiredTechs(unitType: UnitType): boolean {
    switch (unitType) {
      case UnitType.Metropolis:
        // Only allow if the player HAS the 'metros' tech
        return (
          this.game?.myPlayer()?.unlockedTechnologies().has("metros") || false
        );
      default:
        return true;
    }
  }

  private getBuildError(item: BuildItemDisplay): string | null {
    if (!this.game?.myPlayer() || !this.playerActions) {
      return "Player not initialized";
    }
    // Tech level requirement
    if (
      item?.minTechLevel &&
      (this.game.myPlayer()?.techLevel() ?? 0) < item.minTechLevel
    ) {
      return `Requires Tech Level ${item.minTechLevel}`;
    }
    // Nuclear dependency: must have at least one power plant
    if (
      item?.nuclear &&
      (!this.game?.myPlayer()?.units ||
        !this.game?.myPlayer()?.units(UnitType.PowerPlant)?.length)
    ) {
      return "Requires at least one Power Plant";
    }
    // Unit type is disabled by game config
    if (this.game?.config()?.isUnitDisabled(item.unitType)) {
      return "Unit currently disabled";
    }

    if (!this.hasRequiredTechs(item.unitType)) {
      return "Requires specific technology";
    }

    // Check buildable units for specific feedback
    const buildableUnits = this.playerActions.buildableUnits ?? [];
    const unit = buildableUnits.find((u) => u.type === item.unitType);
    if (!unit) {
      return "Cannot build this unit now";
    }
    // if (unit.canBuild === false) {
    //   // Try to provide a specific reason if available
    //   if (unit.reason) return unit.reason;
    //   // Fallbacks
    //   if (unit.locked) return "Locked by other requirements";
    //   return "Requirements not met";
    // }
    // Not enough money/resources
    if ((unit.cost ?? 0) > (this.game.myPlayer()?.gold() ?? 0)) {
      return "Not enough gold";
    }
    return null;
  }
  private canBuild(item: BuildItemDisplay): boolean {
    if (this.game?.myPlayer() === null || this.playerActions === null) {
      return false;
    }

    if (
      item?.minTechLevel &&
      (this.game?.myPlayer()?.techLevel() ?? 0) < item.minTechLevel
    ) {
      return false;
    }

    if (!this.hasRequiredTechs(item.unitType)) {
      return false;
    }

    if (
      item?.nuclear &&
      (!this.game?.myPlayer()?.units ||
        !this.game?.myPlayer()?.units(UnitType.PowerPlant)?.length)
    ) {
      return false;
    }

    const buildableUnits = this.playerActions?.buildableUnits ?? [];
    const unit = buildableUnits.filter((u) => u.type === item.unitType);
    if (unit.length === 0) {
      return false;
    }
    return unit[0].canBuild !== false;
  }

  private cost(item: BuildItemDisplay): Gold {
    for (const bu of this.playerActions?.buildableUnits ?? []) {
      if (bu.type === item.unitType) {
        return bu.cost;
      }
    }
    return 0;
  }

  private count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.units(item.unitType).length.toString();
  }

  public onBuildSelected = (item: BuildItemDisplay) => {
    this.eventBus.emit(
      new BuildUnitIntentEvent(
        item.unitType,
        new Cell(this.game.x(this.clickedTile), this.game.y(this.clickedTile)),
      ),
    );
    this.hideMenu();
  };

  render() {
    return html`
      <div
        class="build-menu ${this._hidden ? "hidden" : ""}"
        @contextmenu=${(e) => e.preventDefault()}
      >
        ${this.filteredBuildTable.map(
          (row) => html`
            <div class="build-row">
              ${row.map(
                (item) => html`
                    <button
                      class="build-button"
                      @click=${() => this.onBuildSelected(item)}
                      ?disabled=${!this.canBuild(item)}
                      title=${this.getBuildError(item) || ""}
                    />
                    <img
                      src=${item.icon}
                      alt="${item.unitType}"
                      width="40"
                      height="40"
                    />
                    <span class="build-name"
                      >${item.key && translateText(item.key)}</span
                    >
                    <span class="build-description"
                      >${
                        item.description && translateText(item.description)
                      }</span
                    >
                    <span class="build-cost" translate="no">
                      ${renderNumber(
                        this.game && this.game.myPlayer() ? this.cost(item) : 0,
                      )}
                      <img
                        src=${goldCoinIcon}
                        alt="gold"
                        width="12"
                        height="12"
                        style="vertical-align: middle;"
                      />
                    </span>
                    ${
                      item.countable
                        ? html`<div class="build-count-chip">
                            <span class="build-count">${this.count(item)}</span>
                          </div>`
                        : ""
                    }
                    ${
                      item.minTechLevel
                        ? html`<div class="tech-level-chip">
                            <span class="build-count"
                              >${item.minTechLevel}</span
                            >
                          </div>`
                        : ""
                    }
                  </button>
                `,
              )}
            </div>
          `,
        )}
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }

  showMenu(clickedTile: TileRef) {
    this.clickedTile = clickedTile;
    this._hidden = false;
    this.refresh();
  }

  private refresh() {
    this.game
      .myPlayer()
      ?.actions(this.clickedTile)
      .then((actions) => {
        this.playerActions = actions;
        this.requestUpdate();
      });

    // removed disabled buildings from the buildtable
    this.filteredBuildTable = this.getBuildableUnits();
  }

  private getBuildableUnits(): BuildItemDisplay[][] {
    return buildTable.map((row) =>
      row.filter((item) => !this.game?.config()?.isUnitDisabled(item.unitType)),
    );
  }

  get isVisible() {
    return !this._hidden;
  }
}
