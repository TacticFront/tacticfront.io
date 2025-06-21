// src/core/execution/NukeExecution.ts

import { consolex } from "../Consolex";
import {
  Execution,
  Game,
  MessageType,
  Player,
  PlayerID,
  TerraNullius,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { ParabolaPathFinder } from "../pathfinding/PathFinding";
import { PseudoRandom } from "../PseudoRandom";
import { NukeType } from "../StatsSchemas";

export class NukeExecution implements Execution {
  private active = true;
  private launched = false;
  private player: Player | null = null;
  private mg: Game | null = null;
  private nuke: Unit | null = null;
  private tilesToDestroyCache: Set<TileRef> | undefined;

  private random: PseudoRandom;
  private pathFinder: ParabolaPathFinder;
  private delayTicks: number = 2; // Add delayTicks property

  constructor(
    private type: NukeType,
    private senderID: PlayerID,
    private dst: TileRef,
    private src?: TileRef | null,
    private speed: number = -1,
    private waitTicks = 0, // Keep waitTicks property but remove its usage in tick
  ) {}

  init(mg: Game, ticks: number): void {
    console.log("Nuke Init");
    if (!mg.hasPlayer(this.senderID)) {
      console.log("Sender not found error");
      console.warn(`NukeExecution: sender ${this.senderID} not found`);
      this.active = false;
      return;
    }

    this.mg = mg;
    this.player = mg.player(this.senderID);
    this.random = new PseudoRandom(ticks);
    if (this.speed === -1) {
      this.speed = this.mg.config().defaultNukeSpeed();
    }
    this.pathFinder = new ParabolaPathFinder(mg);
  }

  public target(): Player | TerraNullius {
    if (this.mg === null) {
      throw new Error("Not initialized");
    }
    return this.mg.owner(this.dst);
  }

  private tilesToDestroy(): Set<TileRef> {
    if (this.tilesToDestroyCache !== undefined) {
      return this.tilesToDestroyCache;
    }
    if (this.mg === null || this.nuke === null) {
      throw new Error("Not initialized");
    }
    const magnitude = this.mg.config().nukeMagnitudes(this.nuke.type());
    const rand = new PseudoRandom(this.mg.ticks());
    const inner2 = magnitude.inner * magnitude.inner;
    const outer2 = magnitude.outer * magnitude.outer;
    this.tilesToDestroyCache = this.mg.bfs(this.dst, (_, n: TileRef) => {
      const d2 = this.mg?.euclideanDistSquared(this.dst, n) ?? 0;
      return d2 <= outer2 && (d2 <= inner2 || rand.chance(2));
    });
    return this.tilesToDestroyCache;
  }

  private breakAlliances(toDestroy: Set<TileRef>) {
    if (this.mg === null || this.player === null || this.nuke === null) {
      throw new Error("Not initialized");
    }
    const attacked = new Map<Player, number>();
    for (const tile of toDestroy) {
      const owner = this.mg.owner(tile);
      if (owner.isPlayer()) {
        const prev = attacked.get(owner) ?? 0;
        attacked.set(owner, prev + 1);
      }
    }

    for (const [other, tilesDestroyed] of attacked) {
      if (tilesDestroyed > 100 && this.nuke.type() !== UnitType.MIRVWarhead) {
        // Mirv warheads shouldn't break alliances
        const alliance = this.player.allianceWith(other);
        if (alliance !== null) {
          this.player.breakAlliance(alliance);
        }
        if (other !== this.player) {
          other.updateRelation(this.player, -100);
        }
      }
    }
  }

  tick(ticks: number): void {
    console.log("Nuke Tick");
    if (this.mg === null || this.player === null) {
      throw new Error("Not initialized");
    }

    if (this.delayTicks > 0) {
      // Check delayTicks
      this.delayTicks--;
      return;
    }

    if (this.nuke === null) {
      const spawn = this.src ?? this.player.canBuild(this.type, this.dst);
      console.log("Spawn determined:", spawn);
      if (spawn === false) {
        console.log("No Silo Spawn");
        consolex.warn(`cannot build Nuke`);
        this.active = false;
        return;
      }
      this.pathFinder.computeControlPoints(
        spawn,
        this.dst,
        this.type !== UnitType.MIRVWarhead,
      );
      this.nuke = this.player.buildUnit(this.type, spawn, {
        targetTile: this.dst,
      });
      console.log("Nuke unit created:", this.nuke);
      console.log("Nuke should have fired here");
      if (this.mg.hasOwner(this.dst)) {
        const target = this.mg.owner(this.dst);
        if (!target.isPlayer()) {
          // Ignore terra nullius
        } else if (this.type === UnitType.CruiseMissile) {
          this.mg.displayIncomingUnit(
            this.nuke.id(),
            `${this.player.name()} - cruise missile inbound`,
            MessageType.ERROR,
            target.id(),
          );
          //this.breakAlliances(this.tilesToDestroy());
        } else if (this.type === UnitType.AtomBomb) {
          this.mg.displayIncomingUnit(
            this.nuke.id(),
            `${this.player.name()} - atom bomb inbound`,
            MessageType.ERROR,
            target.id(),
          );
          //this.breakAlliances(this.tilesToDestroy());
        } else if (this.type === UnitType.HydrogenBomb) {
          this.mg.displayIncomingUnit(
            this.nuke.id(),
            `${this.player.name()} - hydrogen bomb inbound`,
            MessageType.ERROR,
            target.id(),
          );
          this.breakAlliances(this.tilesToDestroy());
        }

        // Record stats
        this.mg
          .stats()
          .bombLaunch(this.player, target, this.nuke.type() as NukeType);
      }

      // after sending a nuke set the missilesilo on cooldown
      const silo = this.player
        .units(UnitType.MissileSilo)
        .find((silo) => silo.tile() === spawn);
      if (silo) {
        console.log("Missile silo found at spawn:", spawn);

        silo.removeStock("Launch Tubes", 1);
        silo.touch();
        // CooldownProject
        if (silo.getStock("Launch Tubes") === 0) {
          // no ammo — go onto full reload
          silo.setCooldown(silo.owner().getVar("samReloadTime"));
          silo.touch();
          return;
        }
        console.log("Missile silo launch invoked at spawn:", spawn);
      } else {
        console.warn("No missile silo found at spawn:", spawn);
      }
      // Removed waitTicks logic here
      return;
    }

    // make the nuke unactive if it was intercepted
    if (!this.nuke.isActive()) {
      consolex.log(`Nuke destroyed before reaching target`);
      this.active = false;
      return;
    }

    // Removed waitTicks check here
    if (this.waitTicks > 0) {
      this.waitTicks--;
      return;
    }

    // Move to next tile
    const nextTile = this.pathFinder.nextTile(this.speed);
    if (nextTile === true) {
      this.detonate();
      return;
    } else {
      this.nuke.move(nextTile);
    }
  }

  private removeTube() {}

  private detonate() {
    if (this.mg === null || this.nuke === null || this.player === null) {
      throw new Error("Not initialized");
    }

    const magnitude = this.mg.config().nukeMagnitudes(this.nuke.type());
    const toDestroy = this.tilesToDestroy();
    //this.breakAlliances(toDestroy);

    for (const tile of toDestroy) {
      const owner = this.mg.owner(tile);
      if (owner.isPlayer()) {
        if (this.nuke.type() !== UnitType.CruiseMissile) {
          owner.relinquish(tile);
        }

        owner.removeTroops(
          this.mg
            .config()
            .nukeDeathFactor(owner.troops(), owner.numTilesOwned()),
        );
        owner.removeWorkers(
          this.mg
            .config()
            .nukeDeathFactor(owner.workers(), owner.numTilesOwned()),
        );
        owner.outgoingAttacks().forEach((attack) => {
          const deaths =
            this.mg
              ?.config()
              .nukeDeathFactor(attack.troops(), owner.numTilesOwned()) ?? 0;
          attack.setTroops(attack.troops() - deaths);
        });
        owner.units(UnitType.TransportShip).forEach((attack) => {
          const deaths =
            this.mg
              ?.config()
              .nukeDeathFactor(attack.troops(), owner.numTilesOwned()) ?? 0;
          attack.setTroops(attack.troops() - deaths);
        });
      }

      if (this.mg.isLand(tile) && this.nuke.type() !== UnitType.CruiseMissile) {
        this.mg.setFallout(tile, true);
      }
    }

    console.log(`Nuke detonated at ${this.dst}`, this.nuke.type());

    const outer2 = magnitude.outer * magnitude.outer;
    if (this.nuke.type() === UnitType.CruiseMissile) {
      for (const unit of this.mg.units()) {
        if (
          unit.type() !== UnitType.CruiseMissile &&
          unit.type() !== UnitType.AtomBomb &&
          unit.type() !== UnitType.HydrogenBomb &&
          unit.type() !== UnitType.MIRVWarhead &&
          unit.type() !== UnitType.MIRV
        ) {
          if (this.mg.euclideanDistSquared(this.dst, unit.tile()) < outer2) {
            if (
              unit.type() === UnitType.SAMLauncher ||
              unit.type() === UnitType.DefensePost ||
              unit.type() === UnitType.MissileSilo
            ) {
              if (unit.isDamaged()) {
                unit.delete(true, this.player);
              } else {
                unit.setRepairCooldown(
                  this.mg.config().unitRepairCooldown(unit.type()),
                );
              }
            }
          }
        }
      }
    } else {
      for (const unit of this.mg.units()) {
        if (
          unit.type() !== UnitType.CruiseMissile &&
          unit.type() !== UnitType.AtomBomb &&
          unit.type() !== UnitType.HydrogenBomb &&
          unit.type() !== UnitType.MIRVWarhead &&
          unit.type() !== UnitType.MIRV
        ) {
          if (this.mg.euclideanDistSquared(this.dst, unit.tile()) < outer2) {
            unit.delete(true, this.player);
          }
        }
      }
    }

    this.active = false;
    this.nuke.setReachedTarget();
    this.nuke.delete(false);

    // Record stats
    this.mg
      .stats()
      .bombLand(this.player, this.target(), this.nuke.type() as NukeType);
  }

  owner(): Player {
    if (this.player === null) {
      throw new Error("Not initialized");
    }
    return this.player;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
