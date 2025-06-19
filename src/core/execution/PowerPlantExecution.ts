// src/core/execution/PowerPlantExecution.ts

import { consolex } from "../Consolex";
import {
  Execution,
  Game,
  Player,
  PlayerID,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

export class PowerPlantExecution implements Execution {
  private mg: Game;
  private powerPlant: Unit | undefined;
  private player: Player;
  private active: boolean = true;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      consolex.warn(`PowerPlantExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
  }

  tick(ticks: number): void {
    // Build the power plant if it doesn't exist yet
    if (!this.powerPlant) {
      const spawnTile = this.player.canBuild(UnitType.PowerPlant, this.tile);
      if (spawnTile === false) {
        consolex.warn("PowerPlantExecution: cannot build power plant");
        this.active = false;
        return;
      }
      this.powerPlant = this.player.buildUnit(
        UnitType.PowerPlant,
        spawnTile,
        {},
      );
    }

    // Deactivate if power plant is destroyed
    if (!this.powerPlant.isActive()) {
      this.active = false;
      return;
    }

    // Ensure current owner
    if (this.player !== this.powerPlant.owner()) {
      this.player = this.powerPlant.owner();
    }

    // Resource generation settings from player vars (or defaults)
    const cycleTime = 240;
    const generationRate =
      this.player.getVar("powerPlantMaterialGenerationRate") ?? 1;
    const maxStockpile =
      this.player.getVar("powerPlantMaterialGenerationMax") ?? 10;

    // Get this unit's current stockpile (stored per unit)
    let stockpile = this.powerPlant.getStock("Nuclear Material") ?? 0;

    // Generate resource for this unit if below max
    if (stockpile < maxStockpile && ticks % cycleTime === 0) {
      stockpile += 1;
      this.powerPlant.setStock("Nuclear Material", stockpile);
      this.powerPlant.touch();
      // Optionally: Add a log or message if you want
      // this.mg.displayMessage("Power plant produced 1 material", MessageType.INFO, this.player.id());
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
