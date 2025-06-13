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
import { PseudoRandom } from "../PseudoRandom";
import { SAMMissileExecution } from "./SAMMissileExecution";

export class SAMLauncherExecution implements Execution {
  private player: Player;
  private mg: Game;

  private active: boolean = true;

  private MIRVWarheadSearchRadius = 400;
  private MIRVWarheadProtectionRadius = 50;
  private nextReload: number;

  private pseudoRandom: PseudoRandom | undefined;

  constructor(
    private ownerId: PlayerID,
    private tile: TileRef | null,
    private sam: Unit | null = null,
  ) {
    if (sam !== null) {
      this.tile = sam.tile();
    }
  }

  init(mg: Game, ticks: number): void {
    this.mg = mg;

    if (!mg.hasPlayer(this.ownerId)) {
      consolex.warn(`SAMLauncherExecution: player ${this.ownerId} not found`);
      this.active = false;
      return;
    }
    this.player = mg.player(this.ownerId);

    this.constructing();
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
      });

      this.sam!.setStock(
        "missiles",
        this.sam!.owner().getVar("samInterceptors"),
      );
      // start with a fresh timer
      this.nextReload = this.sam!.owner().getVar("samReloadTime");
    }
  }

  tick(ticks: number): void {
    if (this.mg === null || this.player === null) {
      throw new Error("Not initialized");
    }

    if (!this.sam!.isActive()) {
      this.active = false;
      return;
    }

    if (this.player !== this.sam!.owner()) {
      this.player = this.sam!.owner();
    }

    if (this.pseudoRandom === undefined) {
      this.pseudoRandom = new PseudoRandom(this.sam!.id());
    }

    const cooldown = this.sam!.ticksLeftInCooldown();
    if (typeof cooldown === "number" && cooldown >= 0) {
      this.sam!.touch();
    }

    this.handleReloads();

    if (this.sam!.isDamaged()) {
      this.sam!.checkRepairs();

      if (this.sam!.isDamaged()) {
        return;
      }
    }

    if (this.pseudoRandom === undefined) {
      this.pseudoRandom = new PseudoRandom(this.sam!.id());
    }

    const mirvWarheadTargets = this.findMirvWarheadTargets();
    let target: Unit | null = mirvWarheadTargets[0] ?? null;
    if (!target) {
      target = this.getSingleTarget();
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
        this.attemptFireMissile(target);
      } else {
        throw new Error("target is null");
      }
    }
  }

  findMirvWarheadTargets(): Unit[] {
    const mirvWarheadTargets = this.mg
      .nearbyUnits(
        this.sam!.tile(),
        this.MIRVWarheadSearchRadius,
        UnitType.MIRVWarhead,
      )
      .map(({ unit }) => unit)
      .filter(
        (unit) =>
          unit.owner() !== this.sam!.owner() &&
          !this.sam!.owner().isFriendly(unit.owner()),
      )
      .filter((unit) => {
        const dst = unit.targetTile();
        return (
          this !== null &&
          dst !== undefined &&
          this.mg.manhattanDist(dst, this.sam!.tile()) <
            this.MIRVWarheadProtectionRadius
        );
      });
    return mirvWarheadTargets;
  }

  getSingleTarget(): Unit | null {
    const nukes = this.mg
      .nearbyUnits(
        this.sam!.tile(),
        this.sam!.owner().getVar("samSearchRange"),
        [UnitType.CruiseMissile, UnitType.AtomBomb, UnitType.HydrogenBomb],
      )
      .map((r) => r.unit)
      .filter(
        (u) =>
          u.owner() !== this.sam!.owner() &&
          !this.sam!.owner().isFriendly(u.owner()),
      );

    return (
      nukes.sort((a, b) => {
        // 1) hydrogen bombs first
        if (
          a.type() === UnitType.HydrogenBomb &&
          b.type() !== UnitType.HydrogenBomb
        )
          return -1;
        if (
          a.type() !== UnitType.HydrogenBomb &&
          b.type() === UnitType.HydrogenBomb
        )
          return 1;
        // 2) otherwise by manhattan distance
        const da = this.mg.manhattanDist(a.tile(), this.sam!.tile());
        const db = this.mg.manhattanDist(b.tile(), this.sam!.tile());
        return da - db;
      })[0] ?? null
    );
  }

  handleReloads() {
    // Only count down if we're actually missing interceptors
    if (
      this.sam!.getStock("missiles") <
      this.sam!.owner().getVar("samInterceptors")
    ) {
      this.nextReload--;
      if (this.nextReload <= 0) {
        this.sam!.addStock("missiles", 1);
        this.sam!.touch(); // push update
        this.nextReload = this.sam!.owner().getVar("samReloadTime");
      }
    } else {
      // At max, reset the timer so that after firing you start fresh
      this.nextReload = this.sam!.owner().getVar("samReloadTime");
    }
  }

  attemptFireMissile(target: Unit) {
    if (this.sam!.getStock("missiles") === 0) {
      // no ammo — go onto full reload
      this.sam!.setCooldown(
        this.nextReload || this.sam!.owner().getVar("samReloadTime"),
      );
      return;
    }

    // fire!
    target.setTargetedBySAM(true);
    this.mg.addExecution(
      new SAMMissileExecution(
        this.sam!.tile(),
        this.sam!.owner(),
        this.sam!,
        target,
      ),
    );
    this.sam!.removeStock("missiles", 1);

    // after removing, if we’re now empty:
    if (this.sam!.getStock("missiles") === 0) {
      // start a fresh cooldown timer
      this.sam!.setCooldown(this.sam!.owner().getVar("samReloadTime"));
      // and reset reload countdown so handleReloads will wait the full time
      this.nextReload = this.sam!.owner().getVar("samReloadTime");
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
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
}
