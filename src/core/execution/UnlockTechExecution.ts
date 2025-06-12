// src/core/execution/UnlockTechExecution.ts

import { Execution, Game, Player } from "../game/Game"; // Import Execution
import { techList } from "../types/Techs";

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
    // 1) Look up the tech
    const tech = techList.find((t) => t.id === this.techId);
    if (!tech) {
      console.warn(`UnlockTech: unknown tech id ${this.techId}`);
      return;
    }

    // 2) Check if already unlocked
    if (this.player.hasTech(this.techId)) {
      return;
    }

    // 3) Verify the player can afford it
    const currentGold = this.player.gold();
    if (currentGold < BigInt(tech.cost)) {
      // You could display a message or emit an error here
      return;
    }

    // 4) Deduct cost and unlock
    this.player.removeGold(BigInt(tech.cost));
    this.player.unlockTech(this.techId);

    // 5) Apply the tech’s effects
    switch (this.techId) {
      case "samReload1":
        this.player.setVar("samReloadTime", 250);
        break;
      case "samRange1":
        this.player.setVar("samSearchRange", 125);
        break;
      case "samSpeed1":
        this.player.setVar("samMissileSpeed", 16);
        break;
      case "samInterceptor1":
        this.player.setVar("samInterceptors", 2);
        break;
      default:
        break;
    }

    // this._vars.set("cruiseEvasion", 40);
    // this._vars.set("atomEvasion", 30);
    // this._vars.set("hydrogenEvasion", 25);

    // No initialization needed for this execution
  }

  tick(ticks: number) {
    // No per-tick logic needed for this execution
  }
}
