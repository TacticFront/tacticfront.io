// src/core/game/Units/SAMLauncherUnit.ts

// src/core/game/units/SAMLauncherUnit.ts
import { SAMMissileExecution } from "../../execution/SAMMissileExecution";
import { Unit, UnitType } from "../Game";
import { GameImpl } from "../GameImpl";
import { TileRef } from "../GameMap";
import { PlayerImpl } from "../PlayerImpl";
import { UnitImpl } from "../UnitImpl";

export class SAMLauncherUnit extends UnitImpl {
  // As MIRV go very fast we have to detect them very early but we only
  // shoot the one targeting very close (MIRVWarheadProtectionRadius)
  private MIRVWarheadSearchRadius = 400;
  private MIRVWarheadProtectionRadius = 50;
  private player: PlayerImpl;
  private nextReload: number;

  constructor(
    mg: GameImpl,
    tile: TileRef,
    id: number,
    owner: PlayerImpl,
    params?: { cooldownDuration?: number }, // tighten params if you like
  ) {
    super(UnitType.SAMLauncher, mg, tile, id, owner, {
      cooldownDuration: params?.cooldownDuration,
    });
    this.player = owner;

    this.setStock("missiles", this.player.getVar("samInterceptors"));
    // start with a fresh timer
    this.nextReload = this.player.getVar("samReloadTime");
  }

  /** A convenience wrapper around your Execution logic */
  public scanAndFire() {
    // you can even reuse parts of your SAMLauncherExecution here:
    const nearby = this.game() // suppose you add a protected getter:
      .nearbyUnits(this.tile(), 100, UnitType.MIRVWarhead);
    // filter & launch…
  }

  /** Expose `game()` from the protected `mg` field */
  protected game(): GameImpl {
    return (this as any).mg;
  }

  findMirvWarheadTargets(): Unit[] {
    const mirvWarheadTargets = this.game()
      .nearbyUnits(
        this!.tile(),
        this.MIRVWarheadSearchRadius,
        UnitType.MIRVWarhead,
      )
      .map(({ unit }) => unit)
      .filter(
        (unit) =>
          unit.owner() !== this.player && !this.player.isFriendly(unit.owner()),
      )
      .filter((unit) => {
        const dst = unit.targetTile();
        return (
          this !== null &&
          dst !== undefined &&
          this.game().manhattanDist(dst, this.tile()) <
            this.MIRVWarheadProtectionRadius
        );
      });
    return mirvWarheadTargets;
  }

  getSingleTarget(): Unit | null {
    const nukes = this.game()
      .nearbyUnits(this.tile(), this.player.getVar("samSearchRange"), [
        UnitType.CruiseMissile,
        UnitType.AtomBomb,
        UnitType.HydrogenBomb,
      ])
      .map((r) => r.unit)
      .filter(
        (u) => u.owner() !== this.player && !this.player.isFriendly(u.owner()),
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
        const da = this.game().manhattanDist(a.tile(), this.tile());
        const db = this.game().manhattanDist(b.tile(), this.tile());
        return da - db;
      })[0] ?? null
    );
  }

  handleReloads() {
    const max = this.player.getVar("samInterceptors");
    // Only count down if we're actually missing interceptors
    if (this.getStock("missiles") < max) {
      this.nextReload--;
      if (this.nextReload <= 0) {
        this.addStock("missiles", 1);
        this.touch(); // push update
        this.nextReload = this.player.getVar("samReloadTime");
      }
    } else {
      // At max, reset the timer so that after firing you start fresh
      this.nextReload = this.player.getVar("samReloadTime");
    }
  }

  attemptFireMissile(target: Unit) {
    if (this.getStock("missiles") === 0) {
      // no ammo — go onto full reload
      this.setCooldown(this.nextReload || this.player.getVar("samReloadTime"));
      return;
    }

    // fire!
    target.setTargetedBySAM(true);
    this.game().addExecution(
      new SAMMissileExecution(this.tile(), this.owner(), this, target),
    );
    this.removeStock("missiles", 1);

    // after removing, if we’re now empty:
    if (this.getStock("missiles") === 0) {
      // start a fresh cooldown timer
      this.setCooldown(this.player.getVar("samReloadTime"));
      // and reset reload countdown so handleReloads will wait the full time
      this.nextReload = this.player.getVar("samReloadTime");
    }
  }
}
