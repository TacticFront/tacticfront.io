// src/core/execution/MissileSiloExecution.ts

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

export class MissileSiloExecution implements Execution {
  private active = true;
  private mg: Game | null = null;
  private player: Player | null = null;
  private silo: Unit | null = null;

  private nextReload: number;

  constructor(
    private _owner: PlayerID,
    private tile: TileRef,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this._owner)) {
      console.warn(`MissileSiloExecution: owner ${this._owner} not found`);
      this.active = false;
      return;
    }
    this.mg = mg;
    this.player = mg.player(this._owner);
    this.constructing();
  }

  constructing(): void {
    if (this.mg === null || this.player === null) {
      throw new Error("Not initialized");
    }
    if (this.silo === null) {
      const spawn = this.player.canBuild(UnitType.MissileSilo, this.tile);
      if (spawn === false) {
        consolex.warn(
          `player ${this.player} cannot build missile silo at ${this.tile}`,
        );
        this.active = false;
        return;
      }
      this.silo = this.player.buildUnit(UnitType.MissileSilo, spawn, {
        cooldownDuration: this.mg.config().SiloCooldown(),
      });
      // Set initial tubes to max
      this.silo!.setStock(
        "Launch Tubes",
        this.silo!.owner().getVar("missileSiloTubes") ?? 1,
      );
      // Start reload timer
      this.nextReload =
        this.silo!.owner().getVar("missileSiloTubeRegenTime") ?? 240;
    }
  }

  tick(ticks: number): void {
    if (this.player === null || this.mg === null || this.silo === null) {
      throw new Error("Not initialized");
    }

    if (!this.silo.isActive()) {
      this.active = false;
      return;
    }

    // In case of ownership transfer
    if (this.player !== this.silo.owner()) {
      this.player = this.silo.owner();
    }

    this.silo.tickCooldown();
    this.silo.checkRepairs();

    this.handleReloads();
  }

  handleReloads() {
    const maxTubes = this.silo!.owner().getVar("missileSiloTubes") ?? 1;
    const regenTime =
      this.silo!.owner().getVar("missileSiloTubeRegenTime") ?? 240;

    // Only reload if not full
    if (this.silo!.getStock("Launch Tubes") < maxTubes) {
      this.nextReload--;
      if (this.nextReload <= 0) {
        this.silo!.addStock("Launch Tubes", 1);
        this.silo!.touch(); // update client/UI if needed
        this.nextReload = regenTime;
      }
    } else {
      // At max, always reset timer so it doesn't accumulate partial reloads
      this.nextReload = regenTime;
    }
  }

  // Use this to spend a tube when launching
  consumeTube(): boolean {
    if (this.silo!.getStock("Launch Tubes") > 0) {
      this.silo!.removeStock("Launch Tubes", 1);
      this.silo!.touch();
      return true;
    }
    return false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
