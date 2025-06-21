// src/core/execution/MetropolisExecution.ts

// src/core/execution/CityExecution copy.ts

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

export class MetropolisExecution implements Execution {
  private player: Player;
  private mg: Game;
  private metropolis: Unit | null = null;
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
    if (this.metropolis === null) {
      const spawnTile = this.player.canBuild(UnitType.Metropolis, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build city");
        this.active = false;
        return;
      }
      this.metropolis = this.player.buildUnit(
        UnitType.Metropolis,
        spawnTile,
        {},
      );
    }
    if (!this.metropolis.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.metropolis.owner()) {
      this.player = this.metropolis.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
