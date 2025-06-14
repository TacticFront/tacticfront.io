// src/core/execution/BarracksExecution.ts

// src/core/execution/HospitalExecution.ts

// src/core/execution/hospitalExecution.ts

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

export class BarracksExecution implements Execution {
  private player: Player;
  private mg: Game;
  private barracks: Unit | null = null;
  private active: boolean = true;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      console.warn(`BarracksExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
  }

  tick(ticks: number): void {
    if (this.barracks === null) {
      const spawnTile = this.player.canBuild(UnitType.Barracks, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build hospital");
        this.active = false;
        return;
      }
      this.barracks = this.player.buildUnit(UnitType.Barracks, spawnTile, {});
    }
    if (!this.barracks.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.barracks.owner()) {
      this.player = this.barracks.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
