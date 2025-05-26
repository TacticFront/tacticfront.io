// src/core/execution/ResearchLabExecution.ts

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

export class ResearchLabExecution implements Execution {
  private player: Player;
  private mg: Game;
  private researchLab: Unit | null = null;
  private active: boolean = true;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      consolex.warn(`ResearchLabExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
    this.player["_techLevel" as any]++;
  }

  tick(ticks: number): void {
    if (this.researchLab === null) {
      const spawnTile = this.player.canBuild(UnitType.ResearchLab, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build research lab");
        this.active = false;
        return;
      }
      this.researchLab = this.player.buildUnit(
        UnitType.ResearchLab,
        spawnTile,
        {},
      );
    }
    if (!this.researchLab.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.researchLab.owner()) {
      this.player = this.researchLab.owner();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
