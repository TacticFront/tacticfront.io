// src/core/execution/SAMMissileExecution.ts

import {
  Execution,
  Game,
  MessageType,
  Player,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { AirPathFinder } from "../pathfinding/PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { NukeType } from "../StatsSchemas";

export class SAMMissileExecution implements Execution {
  private active = true;
  private pathFinder: AirPathFinder;
  private SAMMissile: Unit | undefined;
  private mg: Game;

  constructor(
    private spawn: TileRef,
    private _owner: Player,
    private ownerUnit: Unit,
    private target: Unit,
  ) {}

  init(mg: Game, ticks: number): void {
    this.pathFinder = new AirPathFinder(mg, new PseudoRandom(mg.ticks()));
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (this.SAMMissile === undefined) {
      this.SAMMissile = this._owner.buildUnit(
        UnitType.SAMMissile,
        this.spawn,
        {},
      );
    }
    if (!this.SAMMissile.isActive()) {
      this.active = false;
      return;
    }
    // Mirv warheads are too fast, and mirv shouldn't be stopped ever
    const nukesWhitelist = [
      UnitType.CruiseMissile,
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
    ];
    if (
      !this.target.isActive() ||
      !this.ownerUnit.isActive() ||
      this.target.owner() === this.SAMMissile.owner() ||
      !nukesWhitelist.includes(this.target.type())
    ) {
      this.SAMMissile.delete(false);
      this.active = false;
      return;
    }
    for (let i = 0; i < this._owner.getVar("samMissileSpeed"); i++) {
      const result = this.pathFinder.nextTile(
        this.SAMMissile.tile(),
        this.target.tile(),
      );
      if (result === true) {
        this.mg.displayMessage(
          `Missile intercepted ${this.target.type()}`,
          MessageType.SUCCESS,
          this._owner.id(),
        );
        this.active = false;

        if (this.intercepted()) {
          this.target.delete(true, this._owner);
          this.SAMMissile.delete(false);

          this.mg
            .stats()
            .bombIntercept(
              this._owner,
              this.target.owner(),
              this.target.type() as NukeType,
            );
        } else {
          this.target.setTargetedBySAM(false);
          this.SAMMissile.delete(true);
        }

        return;
      } else {
        this.SAMMissile.move(result);
      }
    }
  }

  intercepted(): boolean {
    let evasion;
    switch (this.target.type()) {
      case UnitType.AtomBomb:
        evasion = this.target.owner().getVar("atomEvasion");
        break;
      case UnitType.CruiseMissile:
        evasion = this.target.owner().getVar("cruiseEvasion");
        break;
      case UnitType.HydrogenBomb:
        evasion = this.target.owner().getVar("hydrogenEvasion");
        break;
      default:
        evasion = 10;
        break;
    }

    const targetingBonus = this._owner.getVar("samTargetingBonus") ?? 30;
    evasion = evasion ?? 10;
    const baseChance = 60;

    const chance = baseChance + targetingBonus - evasion;
    const clampedChance = Math.max(0, Math.min(100, chance));

    return Math.random() * 100 < clampedChance;
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
