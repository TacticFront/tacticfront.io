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
  private player: Player;
  private mg: Game;
  private powerPlant: Unit | null = null;
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
    if (this.powerPlant === null) {
      const spawnTile = this.player.canBuild(UnitType.PowerPlant, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build city");
        this.active = false;
        return;
      }
      this.powerPlant = this.player.buildUnit(
        UnitType.PowerPlant,
        spawnTile,
        {},
      );
    }
    if (!this.powerPlant.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.powerPlant.owner()) {
      this.player = this.powerPlant.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
