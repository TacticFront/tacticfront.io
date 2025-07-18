// src/core/execution/AttackExecution.ts

import { renderNumber, renderTroops } from "../../client/Utils";
import {
  Attack,
  Execution,
  Game,
  MessageType,
  Player,
  PlayerID,
  PlayerType,
  TerrainType,
  TerraNullius,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { FlatBinaryHeap } from "./utils/FlatBinaryHeap"; // adjust path if needed

const malusForRetreat = 25;
export class AttackExecution implements Execution {
  private breakAlliance = false;
  private active: boolean = true;
  private toConquer = new FlatBinaryHeap();

  private random = new PseudoRandom(123);

  private _owner: Player;
  private target: Player | TerraNullius;
  private markDelete: boolean = false;

  private mg: Game;

  private attack: Attack | null = null;

  constructor(
    private startTroops: number | null = null,
    private _ownerID: PlayerID,
    private _targetID: PlayerID | null,
    private sourceTile: TileRef | null = null,
    private removeTroops: boolean = true,
  ) {}

  public targetID(): PlayerID | null {
    return this._targetID;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game, ticks: number) {
    if (!this.active) {
      return;
    }
    this.mg = mg;

    if (!mg.hasPlayer(this._ownerID)) {
      console.warn(`player ${this._ownerID} not found`);
      this.active = false;
      return;
    }
    if (this._targetID !== null && !mg.hasPlayer(this._targetID)) {
      console.warn(`target ${this._targetID} not found`);
      this.active = false;
      return;
    }

    this._owner = mg.player(this._ownerID);
    this.target =
      this._targetID === this.mg.terraNullius().id()
        ? mg.terraNullius()
        : mg.player(this._targetID);

    if (this.target && this.target.isPlayer()) {
      const targetPlayer = this.target as Player;
      if (
        targetPlayer.type() !== PlayerType.Bot &&
        this._owner.type() !== PlayerType.Bot
      ) {
        // Don't let bots embargo since they can't trade anyway.
        targetPlayer.addEmbargo(this._owner.id(), true);
      }
    }

    if (this._owner === this.target) {
      console.error(`Player ${this._owner} cannot attack itself`);
      this.active = false;
      return;
    }

    if (this.target.isPlayer()) {
      if (
        this.mg.config().numSpawnPhaseTurns() +
          this.mg.config().spawnImmunityDuration() >
        this.mg.ticks()
      ) {
        console.warn("cannot attack player during immunity phase");
        this.active = false;
        return;
      }
      if (this._owner.isOnSameTeam(this.target)) {
        console.warn(
          `${this._owner.displayName()} cannot attack ${this.target.displayName()} because they are on the same team`,
        );
        this.active = false;
        return;
      }
    }

    if (this.startTroops === null) {
      this.startTroops = this.mg
        .config()
        .attackAmount(this._owner, this.target);
    }
    if (this.removeTroops) {
      this.startTroops = Math.min(this._owner.troops(), this.startTroops);
      this._owner.removeTroops(this.startTroops);
    }
    this.attack = this._owner.createAttack(
      this.target,
      this.startTroops,
      this.sourceTile,
      new Set<TileRef>(),
    );

    if (this.sourceTile !== null) {
      this.addNeighbors(this.sourceTile);
    } else {
      this.refreshToConquer();
    }

    // Record stats
    this.mg.stats().attack(this._owner, this.target, this.startTroops);

    // for (const incoming of this._owner.incomingAttacks()) {
    //   if (incoming.attacker() === this.target) {
    //     // Target has opposing attack, cancel them out
    //     if (incoming.troops() > this.attack.troops()) {
    //       incoming.setTroops(incoming.troops() - this.attack.troops());
    //       this.attack.delete();
    //       this.active = false;
    //       return;
    //     } else {
    //       this.attack.setTroops(this.attack.troops() - incoming.troops());
    //       incoming.delete();
    //     }
    //   }
    // }
    for (const outgoing of this._owner.outgoingAttacks()) {
      if (
        outgoing !== this.attack &&
        outgoing.target() === this.attack.target() &&
        outgoing.sourceTile() === this.attack.sourceTile()
      ) {
        // Existing attack on same target, add troops
        outgoing.setTroops(outgoing.troops() + this.attack.troops());
        this.active = false;
        this.attack.delete();
        return;
      }
    }

    if (this.target.isPlayer()) {
      if (this._owner.isAlliedWith(this.target)) {
        // No updates should happen in init.
        this.breakAlliance = true;
      }
      this.target.updateRelation(this._owner, -80);
    }
  }

  private refreshToConquer() {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    this.toConquer.clear();
    this.attack.clearBorder();
    for (const tile of this._owner.borderTiles()) {
      this.addNeighbors(tile);
    }
  }

  private retreat(malusPercent = 0) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const deaths = this.attack.troops() * (malusPercent / 100);
    if (deaths) {
      this.mg.displayMessage(
        `Attack cancelled, ${renderTroops(deaths)} soldiers killed during retreat.`,
        MessageType.SUCCESS,
        this._owner.id(),
      );
    }
    const survivors = this.attack.troops() - deaths;
    this._owner.addTroops(survivors);
    this.attack.delete();
    this.active = false;

    // Record stats
    this.mg.stats().attackCancel(this._owner, this.target, survivors);
  }

  resetStats(attack: Attack): void {
    const stats = attack.stats();
    stats.tilesConqueredThisTick = 0;
    stats.totalTroopLossesThisTick = 0;
    stats.troopCount = attack.troops();
  }

  tick(ticks: number) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    this.resetStats(this.attack);

    if (this.attack.troops() < 1) {
      this.attack.delete();
      this.active = false;
      return;
    }

    const maxLosses = Math.max(this.attack.troops() / 80);
    let tickLosses = 0;

    const targetIsPlayer = this.target.isPlayer(); // cache target type
    const targetPlayer = targetIsPlayer ? (this.target as Player) : null; // cache target player

    if (
      ticks % 8 === 0 &&
      targetPlayer !== null &&
      this.attack.troops() < targetPlayer.troops() * 3 &&
      !this.markDelete
    ) {
      if (this._owner.reserveTroopRatio() >= 1) return;
      //this.initialTroopCount * 3) {
      const reserveTroops = this._owner.troops();
      const troopsToAdd = Math.floor(
        (reserveTroops * (1 - this._owner.reserveTroopRatio())) / 20,
      ); // 5% of total troops
      if (troopsToAdd > 0) {
        this._owner.removeTroops(troopsToAdd);
        this.attack.setTroops(this.attack.troops() + troopsToAdd);
      }
    }

    this.attack.stats().startingToConquer = this.toConquer.size();
    this.attack.stats().borderSize = this.attack.borderSize();

    if (ticks % 100 === 0) {
      this.refreshToConquer();

      for (const outgoing of this._owner.outgoingAttacks()) {
        if (
          outgoing !== this.attack &&
          outgoing.target() === this.attack.target() &&
          outgoing.sourceTile() === this.attack.sourceTile()
        ) {
          if (this.attack.troops() < outgoing.troops()) {
            outgoing.setTroops(outgoing.troops() + this.attack.troops());
            this.active = false;
            this.markDelete = true;
            this.attack.delete();
          }
          // Existing attack on same target, add troops

          return;
        }
      }
    }

    let troopCount = this.attack.troops(); // cache troop count
    this.attack.stats().troopCount = this.attack.troops();

    if (this.attack.retreated()) {
      if (targetIsPlayer) {
        this.retreat(malusForRetreat);
      } else {
        this.retreat();
      }
      this.active = false;
      return;
    }

    if (this.attack.retreating()) {
      return;
    }

    if (!this.attack.isActive()) {
      this.active = false;
      return;
    }

    const alliance = targetPlayer
      ? this._owner.allianceWith(targetPlayer)
      : null;
    if (this.breakAlliance && alliance !== null) {
      this.breakAlliance = false;
      this._owner.breakAlliance(alliance);
    }
    if (targetPlayer && this._owner.isAlliedWith(targetPlayer)) {
      // In this case a new alliance was created AFTER the attack started.
      this.retreat();
      return;
    }

    let attackAttempts = this.mg
      .config()
      .attackTilesPerTick(
        troopCount,
        this._owner,
        this.target,
        this.attack.borderSize() + this.random.nextInt(0, 5),
      );

    this.attack.stats().attackAttempts = attackAttempts;
    const initialAttempts = attackAttempts;

    while (attackAttempts > 0) {
      if (tickLosses > maxLosses) {
        break;
      }

      if (this.toConquer.size() === 0) {
        this.refreshToConquer();

        if (this.toConquer.size() === 0) {
          this.retreat();
          break;
        }
      }

      const [tileToConquer] = this.toConquer.dequeue();
      this.attack.removeBorderTile(tileToConquer);

      let onBorder = false;
      for (const n of this.mg.neighbors(tileToConquer)) {
        if (this.mg.owner(n) === this._owner) {
          onBorder = true;
          continue;
        }
      }
      if (
        this.mg.owner(tileToConquer)?.id() !== this.target.id() ||
        !onBorder
      ) {
        continue;
      }
      this.addNeighbors(tileToConquer);
      const attackerDensity = Math.floor(troopCount / this.attack.borderSize());
      const { attackerTroopLoss, defenderTroopLoss, attackAttemptsToConquer } =
        this.mg
          .config()
          .attackLogic(
            this.mg,
            troopCount,
            this._owner,
            attackerDensity,
            this.target,
            tileToConquer,
          );
      attackAttempts -= attackAttemptsToConquer;
      const hospitalTrickleback =
        ((Math.max(
          this._owner.units(UnitType.Hospital).length,
          this._owner.getVar("hospitalMaxNumber"),
        ) *
          this._owner.getVar("hospitalBonusTroopTrickleback")) /
          100) *
        attackerTroopLoss;

      const troopAdjustment = attackerTroopLoss - hospitalTrickleback;
      troopCount -= troopAdjustment;
      tickLosses += troopAdjustment;

      this.attack.setTroops(troopCount);
      if (targetPlayer) {
        targetPlayer.removeTroops(defenderTroopLoss);
      }
      this._owner.conquer(tileToConquer);
      this.handleDeadDefender();
      this.attack.stats().tilesConqueredThisTick++;
      this.attack.stats().tilesConquered++;
    }

    this.attack.stats().attackAttemptsRemainingOnAbort = attackAttempts;
    this.attack.stats().totalTroopLossesThisTick = tickLosses;
    this.attack.stats().totalTroopLosses += tickLosses;
    this.attack.stats().toConquer = this.toConquer.size();
  }

  private addNeighbors(tile: TileRef) {
    if (this.attack === null) {
      throw new Error("Attack not initialized");
    }

    const tickNow = this.mg.ticks(); // cache tick

    for (const neighbor of this.mg.neighbors(tile)) {
      if (
        this.mg.isWater(neighbor) ||
        this.mg.owner(neighbor)?.id() !== this.target.id()
      ) {
        continue;
      }
      this.attack.addBorderTile(neighbor);
      let numOwnedByMe = 0;
      for (const n of this.mg.neighbors(neighbor)) {
        if (this.mg.owner(n) === this._owner) {
          numOwnedByMe++;
        }
      }

      let mag = 0;
      switch (this.mg.terrainType(neighbor)) {
        case TerrainType.Plains:
          mag = 1;
          break;
        case TerrainType.Highland:
          mag = 1.5;
          break;
        case TerrainType.Mountain:
          mag = 2;
          break;
      }

      const priority =
        (this.random.nextInt(0, 7) + 10) * (1 - numOwnedByMe * 0.5 + mag / 2) +
        tickNow;

      this.toConquer.enqueue(neighbor, priority);
    }
  }

  private handleDeadDefender() {
    if (!(this.target.isPlayer() && this.target.numTilesOwned() < 100)) return;

    const gold = this.target.gold();
    this.mg.displayMessage(
      `Conquered ${this.target.displayName()} received ${renderNumber(
        gold,
      )} gold`,
      MessageType.SUCCESS,
      this._owner.id(),
    );
    this.target.removeGold(gold);
    this._owner.addGold(gold);

    for (let i = 0; i < 10; i++) {
      for (const tile of this.target.tiles()) {
        const borders = this.mg
          .neighbors(tile)
          .some((t) => this.mg.owner(t) === this._owner);
        if (borders) {
          this._owner.conquer(tile);
        } else {
          for (const neighbor of this.mg.neighbors(tile)) {
            const no = this.mg.owner(neighbor);
            if (no.isPlayer() && no !== this.target) {
              this.mg.player(no.id()).conquer(tile);
              break;
            }
          }
        }
      }
    }
  }

  owner(): Player {
    return this._owner;
  }

  isActive(): boolean {
    return this.active;
  }
}
