// src/core/execution/SAMLauncherExecution.ts

import { consolex } from "../Consolex";
import {
  Execution,
  Game,
  MessageType,
  Player,
  PlayerID,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { SAMLauncherUnit } from "../game/Units/SAMLauncherUnit";
import { PseudoRandom } from "../PseudoRandom";

export class SAMLauncherExecution implements Execution {
  private player: Player;
  private mg: Game;
  private active: boolean = true;

  private pseudoRandom: PseudoRandom | undefined;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef | null,
    private sam: SAMLauncherUnit | null = null,
  ) {
    if (sam !== null) {
      this.tile = sam.tile();
    }
  }

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.ownerId)) {
      console.warn(`SAMLauncherExecution: owner ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);
    this.constructing();
  }

  private isHit(type: UnitType, random: number): boolean {
    if (type === UnitType.AtomBomb || type === UnitType.CruiseMissile) {
      return true;
    }

    if (type === UnitType.MIRVWarhead) {
      return random < this.mg.config().samWarheadHittingChance();
    }

    return random < this.mg.config().samHittingChance();
  }

  constructing(): void {
    if (this.mg === null || this.player === null) {
      throw new Error("Not initialized");
    }
    if (this.sam === null) {
      if (this.tile === null) {
        throw new Error("tile is null");
      }
      const spawnTile = this.player.canBuild(UnitType.SAMLauncher, this.tile);
      if (spawnTile === false) {
        consolex.warn("cannot build SAM Launcher");
        this.active = false;
        return;
      }
      this.sam = this.player.buildUnit(UnitType.SAMLauncher, spawnTile, {
        cooldownDuration: this.mg.config().SAMCooldown(),
      }) as SAMLauncherUnit;
    }
  }

  tick(ticks: number): void {
    if (!this.sam!.isActive()) {
      this.active = false;
      return;
    }

    // if(this.sam!.cooldown() > 0) {
    //   if(this.sam!.tickCooldown() === 0) {
    //     this.sam!.touch();

    //   }
    // }

    if (this.player !== this.sam!.owner()) {
      this.player = this.sam!.owner();
    }

    const cooldown = this.sam!.ticksLeftInCooldown();
    if (typeof cooldown === "number" && cooldown >= 0) {
      this.sam!.touch();
    }

    this.sam!.handleReloads();

    if (this.player !== this.sam!.owner()) {
      this.player = this.sam!.owner();
    }

    if (this.sam!.isDamaged()) {
      this.sam!.checkRepairs();

      if (this.sam!.isDamaged()) {
        return;
      }
    }

    if (this.pseudoRandom === undefined) {
      this.pseudoRandom = new PseudoRandom(this.sam!.id());
    }

    const mirvWarheadTargets = this.sam!.findMirvWarheadTargets();
    let target: Unit | null = mirvWarheadTargets[0] ?? null;
    if (!target) {
      target = this.sam!.getSingleTarget();
    }

    const isSingleTarget = target && !target.targetedBySAM();
    if (
      (isSingleTarget || mirvWarheadTargets.length > 0) &&
      !this.sam!.isInCooldown()
    ) {
      const type =
        mirvWarheadTargets.length > 0 ? UnitType.MIRVWarhead : target?.type();
      if (type === undefined) throw new Error("Unknown unit type");
      //const random = this.pseudoRandom.next();
      if (mirvWarheadTargets.length > 0) {
        // Message
        this.mg.displayMessage(
          `${mirvWarheadTargets.length} MIRV warheads intercepted`,
          MessageType.SUCCESS,
          this.sam!.owner().id(),
        );
        // Delete warheads
        mirvWarheadTargets.forEach((u) => {
          u.delete();
        });
      } else if (target !== null) {
        this.sam!.attemptFireMissile(target);
      } else {
        throw new Error("target is null");
      }

      // const hit = this.isHit(type, random);
      // if (!hit) {
      //   this.mg.displayMessage(
      //     `Missile failed to intercept ${type}`,
      //     MessageType.ERROR,
      //     this.sam.owner().id(),
      //   );
      // } else {
      //   if (mirvWarheadTargets.length > 0) {
      //     // Message
      //     this.mg.displayMessage(
      //       `${mirvWarheadTargets.length} MIRV warheads intercepted`,
      //       MessageType.SUCCESS,
      //       this.sam.owner().id(),
      //     );
      //     // Delete warheads
      //     mirvWarheadTargets.forEach((u) => {
      //       u.delete();
      //     });
      //   } else if (target !== null) {
      //     target.setTargetedBySAM(true);
      //     this.mg.addExecution(
      //       new SAMMissileExecution(
      //         this.sam.tile(),
      //         this.sam.owner(),
      //         this.sam,
      //         target,
      //       ),
      //     );
      //   } else {
      //     throw new Error("target is null");
      //   }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
