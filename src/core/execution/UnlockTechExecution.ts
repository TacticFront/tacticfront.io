// src/core/execution/UnlockTechExecution.ts

import { Execution, Game, Player } from "../game/Game"; // Import Execution

export class UnlockTechExecution implements Execution {
  // Implement Execution interface
  isActive(): boolean {
    return true;
  } // Implement isActive method
  activeDuringSpawnPhase(): boolean {
    return false;
  } // Implement activeDuringSpawnPhase method
  private mg: Game;
  private player: Player;
  private techId: string;

  constructor(player: Player, techID: string) {
    this.player = player;
    this.techId = techID;
  }

  init(mg: Game, ticks: number) {
    if (!this.player.hasTech(this.techId)) {
      this.player.unlockTech(this.techId);
    }

    // No initialization needed for this execution
  }

  tick(ticks: number) {
    // No per-tick logic needed for this execution
  }
}
