// src/core/execution/SetTroopRatiosExecution.ts

import { consolex } from "../Consolex";
import { Execution, Game, Player, PlayerID } from "../game/Game";

export class SetTroopRatiosExecution implements Execution {
  private player: Player;

  private active = true;

  constructor(
    private playerID: PlayerID,
    private troopRatio: number,
    private reserveRatio: number,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this.playerID)) {
      console.warn(
        `SetTargetTRoopRatioExecution: player ${this.playerID} not found`,
      );
    }
    this.player = mg.player(this.playerID);
  }

  tick(ticks: number): void {
    if (this.troopRatio < 0 || this.troopRatio > 1) {
      consolex.warn(
        `target troop ratio of ${this.troopRatio} for player ${this.player} invalid`,
      );
    } else {
      this.player.setTargetTroopRatio(this.troopRatio);
      this.player.setReserveTroopRatio(this.reserveRatio);
    }
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
