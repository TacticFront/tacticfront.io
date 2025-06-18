// src/core/execution/RadarExecution.ts

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

export class RadarExecution implements Execution {
  private player: Player;
  private mg: Game;
  private radar: Unit | null = null;
  private active: boolean = true;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      console.warn(`CityExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
  }

  tick(ticks: number): void {
    if (this.radar === null) {
      const spawnTile = this.player.canBuild(UnitType.Radar, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build city");
        this.active = false;
        return;
      }
      this.radar = this.player.buildUnit(UnitType.PowerPlant, spawnTile, {});
    }
    if (!this.radar.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.radar.owner()) {
      this.player = this.radar.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
