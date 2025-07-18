// src/core/game/PlayerImpl.ts

import { renderNumber, renderTroops } from "../../client/Utils";
import { consolex } from "../Consolex";
import { PseudoRandom } from "../PseudoRandom";
import { ClientID } from "../Schemas";
import { assertNever, distSortUnit, simpleHash, within } from "../Util";
import { sanitizeUsername } from "../validations/username";
import { AttackImpl } from "./AttackImpl";
import {
  Alliance,
  AllianceRequest,
  AllPlayers,
  Attack,
  BuildableUnit,
  Cell,
  ColoredTeams,
  Embargo,
  EmojiMessage,
  Gold,
  MessageType,
  MutableAlliance,
  Player,
  PlayerID,
  PlayerInfo,
  PlayerProfile,
  PlayerType,
  PlayerTypeKey,
  Relation,
  Team,
  TerraNullius,
  Tick,
  Unit,
  UnitParams,
  UnitType,
} from "./Game";
import { GameImpl } from "./GameImpl";
import { andFN, manhattanDistFN, TileRef } from "./GameMap";
import { AttackUpdate, GameUpdateType, PlayerUpdate } from "./GameUpdates";
import {
  bestShoreDeploymentSource,
  canBuildTransportShip,
} from "./TransportShipUtils";
import { UnitImpl } from "./UnitImpl";

interface Target {
  tick: Tick;
  target: Player;
}

class Donation {
  constructor(
    public readonly recipient: Player,
    public readonly tick: Tick,
  ) {}
}

export class PlayerImpl implements Player {
  public _lastTileChange: number = 0;
  public _pseudo_random: PseudoRandom;

  private _gold: number;
  private _troops: number;
  private _workers: number;
  private _offensiveTroops: number;

  private _techLevel: number;

  private _unlockedTechnologies: Set<string> = new Set(); // Add techTree property

  // 0 to 100
  private _targetTroopRatio: number;
  private _reserveTroopRatio: number;

  markedTraitorTick = -1;

  private embargoes = new Map<PlayerID, Embargo>();

  public _borderTiles: Set<TileRef> = new Set();

  public _units: Unit[] = [];
  public _tiles: Set<TileRef> = new Set();

  private _flag: string | undefined;
  private _name: string;
  private _displayName: string;

  public pastOutgoingAllianceRequests: AllianceRequest[] = [];

  private targets_: Target[] = [];

  private outgoingEmojis_: EmojiMessage[] = [];

  private sentDonations: Donation[] = [];

  private relations = new Map<Player, number>();

  public _incomingAttacks: Attack[] = [];
  public _outgoingAttacks: Attack[] = [];
  public _outgoingLandAttacks: Attack[] = [];

  private _hasSpawned = false;
  private _isDisconnected = false;
  private _vars: Map<string, number> = new Map<string, number>();

  constructor(
    private mg: GameImpl,
    private _smallID: number,
    private readonly playerInfo: PlayerInfo,
    startTroops: number,
    private readonly _team: Team | null,
  ) {
    this._flag = playerInfo.flag;
    this._name = sanitizeUsername(playerInfo.name);
    this._targetTroopRatio = 80;
    this._troops = startTroops;
    this._workers = 0;
    this._gold = 0;
    this._techLevel = 0;
    this._displayName = this._name; // processName(this._name)
    this._pseudo_random = new PseudoRandom(simpleHash(this.playerInfo.id));

    this._vars.set("hospitalBonusPopulationGrowth", 2);
    this._vars.set("hospitalBonusTroopTrickleback", 1);
    this._vars.set("hospitalMaxNumber", 3);
    this._vars.set("samMissileSpeed", 12);
    this._vars.set("samSearchRange", 100);
    this._vars.set("samInterceptors", 2);
    this._vars.set("samReloadTime", 240);
    this._vars.set("samTargetingBonus", 20);
    this._vars.set("navalInvasionMaxCount", 3);
    this._vars.set("warshipMaxInterceptors", 0);
    this._vars.set("warshipMaxInterceptorRange", 80);
    this._vars.set("missileSiloTubes", 1);
    this._vars.set("missileSiloTubeRegenTime", 240);
    this._vars.set("missileSiloMaxCost", 1_000_000);
    this._vars.set("metroPop", 750_000);
    this._vars.set("metroGoldGen", 150);
    this._vars.set("metrosMaxCost", 4_000_000);
    this._vars.set("cruiseEvasion", 15);
    this._vars.set("atomEvasion", 35);
    this._vars.set("hydrogenEvasion", 25);
    this._vars.set("radarRange", 200);
    this._vars.set("radarTargetingBonus", 10);
    this._vars.set("powerPlantGoldGeneration", 250);
    this._vars.set("powerPlantMaxNumber", 4);
    this._vars.set("powerPlantMaterialGenerationRate", 1);
    this._vars.set("powerPlantMaterialGenerationMax", 10);
  }

  largestClusterBoundingBox: { min: Cell; max: Cell } | null;

  toUpdate(): PlayerUpdate {
    const outgoingAllianceRequests = this.outgoingAllianceRequests().map((ar) =>
      ar.recipient().id(),
    );
    const stats = this.mg.stats().getPlayerStats(this);

    const oa: AttackUpdate[] = this._outgoingAttacks.map((a) => {
      return {
        attkrid: a.attacker().smallID(),
        tgt: a.target().smallID(),
        t: a.troops(),
        id: a.id(),
        ...(a.retreating() && { retreating: a.retreating() }),
        b: a.borderSize(),
        //stats: a.stats(),
      } as AttackUpdate;
    });
    const ia: AttackUpdate[] = this._incomingAttacks.map((a) => {
      return {
        attkrid: a.attacker().smallID(),
        tgt: a.target().smallID(),
        t: a.troops(),
        id: a.id(),
        ...(a.retreating() && { retreating: a.retreating() }),
        b: a.borderSize(),
        //stats: a.stats(),
      } as AttackUpdate;
    });

    const targets = this.targets().map((p) => p.smallID());
    const allies = this.alliances().map((a) => a.other(this).smallID());
    const embargoes = new Set(
      [...this.embargoes.keys()].map((p) => p.toString()),
    );
    const betrayals = stats?.betrayals;

    if (this.type() !== PlayerType.Bot)
      return {
        type: GameUpdateType.Player,
        //vars: this._vars,
        ...(this.clientID() !== null && { cid: this.clientID() }),
        ...(this.flag() && { f: this.flag() }),
        n: this.name(),
        id: this.id(),
        ...(this.team() !== null && { team: this.team() ?? undefined }),
        sid: this.smallID(),
        pt: PlayerTypeKey[this.type()],
        ...(this.isDisconnected() && { isDisconnected: true }),
        ti: this.numTilesOwned(),
        g: this._gold,
        ga: this.mg.config().goldAdditionRate(this),
        pa: this.mg.config().populationIncreaseRate(this),
        mp: this.mg.config().maxPopulation(this),
        w: this.workers(),
        t: this.troops(),
        ...(oa.length > 0 && { o: this.offensiveTroops() }),
        ...(allies.length > 0 && { allies }),
        ...(embargoes.size > 0 && { embargoes }),
        ...(this.isTraitor() && { isTraitor: true }),
        ...(this.outgoingEmojis().length > 0 && {
          outgoingEmojis: this.outgoingEmojis(),
        }),
        ...(oa.length > 0 && { oa }),
        ...(ia.length > 0 && { ia }),
        ...(targets.length > 0 && { targets }),
        ...(outgoingAllianceRequests.length > 0 && {
          outgoingAllianceRequests,
        }),
        ...(!this.hasSpawned() && { hasSpawned: false }),
        ...(betrayals !== undefined && { betrayals }),
        ...(this._unlockedTechnologies.size > 0 && {
          unlockedTechnologies: this._unlockedTechnologies,
        }),
        ...(this.techLevel() > 0 && { techLevel: this._techLevel }),
      };

    return {
      type: GameUpdateType.Player,
      n: this.name(),
      id: this.id(),
      sid: this.smallID(),
      ti: this.numTilesOwned(),
      g: this._gold,
      mp: this.mg.config().maxPopulation(this),
      w: this.workers(),
      t: this.troops(),
      ...(oa.length > 0 && { o: this.offensiveTroops() }),
      ...(oa.length > 0 && { oa }),
      ...(ia.length > 0 && { ia }),
      ...(targets.length > 0 && { targets }),
      ...(!this.hasSpawned() && { hasSpawned: false }),
    };
  }

  getVar(name: string): number {
    return this._vars.get(name)!;
  }

  setVar(name: string, value: number): void {
    this._vars.set(name, value)!;
  }

  smallID(): number {
    return this._smallID;
  }

  flag(): string | undefined {
    return this._flag;
  }

  name(): string {
    return this._name;
  }
  displayName(): string {
    return this._displayName;
  }

  clientID(): ClientID | null {
    return this.playerInfo.clientID;
  }

  id(): PlayerID {
    return this.playerInfo.id;
  }

  type(): PlayerType {
    return this.playerInfo.playerType;
  }

  clan(): string | null {
    return this.playerInfo.clan;
  }

  units(...types: UnitType[]): Unit[] {
    if (types.length === 0) {
      return this._units;
    }
    const ts = new Set(types);
    return this._units.filter((u) => ts.has(u.type()));
  }

  unitsIncludingConstruction(type: UnitType): Unit[] {
    const units = this.units(type);
    units.push(
      ...this.units(UnitType.Construction).filter(
        (u) => u.constructionType() === type,
      ),
    );
    return units;
  }

  sharesBorderWith(other: Player | TerraNullius): boolean {
    for (const border of this._borderTiles) {
      for (const neighbor of this.mg.map().neighbors(border)) {
        if (this.mg.map().ownerID(neighbor) === other.smallID()) {
          return true;
        }
      }
    }
    return false;
  }
  numTilesOwned(): number {
    return this._tiles.size;
  }

  tiles(): ReadonlySet<TileRef> {
    return new Set(this._tiles.values()) as Set<TileRef>;
  }

  borderTiles(): ReadonlySet<TileRef> {
    return this._borderTiles;
  }

  neighbors(): (Player | TerraNullius)[] {
    const ns: Set<Player | TerraNullius> = new Set();
    for (const border of this.borderTiles()) {
      for (const neighbor of this.mg.map().neighbors(border)) {
        if (this.mg.map().isLand(neighbor)) {
          const owner = this.mg.map().ownerID(neighbor);
          if (owner !== this.smallID()) {
            ns.add(this.mg.playerBySmallID(owner) as Player | TerraNullius);
          }
        }
      }
    }
    return Array.from(ns);
  }

  isPlayer(): this is Player {
    return true as const;
  }
  setTroops(troops: number) {
    this._troops = troops;
  }
  conquer(tile: TileRef) {
    this.mg.conquer(this, tile);
  }
  orderRetreat(id: string) {
    const attack = this._outgoingAttacks.filter((attack) => attack.id() === id);
    if (!attack || !attack[0]) {
      consolex.warn(`Didn't find outgoing attack with id ${id}`);
      return;
    }
    attack[0].orderRetreat();
  }
  executeRetreat(id: string): void {
    const attack = this._outgoingAttacks.filter((attack) => attack.id() === id);
    // Execution is delayed so it's not an error that the attack does not exist.
    if (!attack || !attack[0]) {
      return;
    }
    attack[0].executeRetreat();
  }
  relinquish(tile: TileRef) {
    if (this.mg.owner(tile) !== this) {
      throw new Error(`Cannot relinquish tile not owned by this player`);
    }
    this.mg.relinquish(tile);
  }
  info(): PlayerInfo {
    return this.playerInfo;
  }
  isAlive(): boolean {
    return this._tiles.size > 0;
  }

  hasSpawned(): boolean {
    return this._hasSpawned;
  }

  setHasSpawned(hasSpawned: boolean): void {
    this._hasSpawned = hasSpawned;
  }

  incomingAllianceRequests(): AllianceRequest[] {
    return this.mg.allianceRequests.filter((ar) => ar.recipient() === this);
  }

  outgoingAllianceRequests(): AllianceRequest[] {
    return this.mg.allianceRequests.filter((ar) => ar.requestor() === this);
  }

  alliances(): MutableAlliance[] {
    return this.mg.alliances_.filter(
      (a) => a.requestor() === this || a.recipient() === this,
    );
  }

  allies(): Player[] {
    return this.alliances().map((a) => a.other(this));
  }

  isAlliedWith(other: Player): boolean {
    if (other === this) {
      return false;
    }
    return this.allianceWith(other) !== null;
  }

  allianceWith(other: Player): MutableAlliance | null {
    if (other === this) {
      return null;
    }
    return (
      this.alliances().find(
        (a) => a.recipient() === other || a.requestor() === other,
      ) ?? null
    );
  }

  canSendAllianceRequest(other: Player): boolean {
    if (other === this) {
      return false;
    }
    if (this.isFriendly(other)) {
      return false;
    }

    const hasPending =
      this.incomingAllianceRequests().some((ar) => ar.requestor() === other) ||
      this.outgoingAllianceRequests().some((ar) => ar.recipient() === other);

    if (hasPending) {
      return false;
    }

    const recent = this.pastOutgoingAllianceRequests
      .filter((ar) => ar.recipient() === other)
      .sort((a, b) => b.createdAt() - a.createdAt());

    if (recent.length === 0) {
      return true;
    }

    const delta = this.mg.ticks() - recent[0].createdAt();

    return delta >= this.mg.config().allianceRequestCooldown();
  }

  breakAlliance(alliance: Alliance): void {
    this.mg.breakAlliance(this, alliance);
  }

  isTraitor(): boolean {
    return (
      this.markedTraitorTick >= 0 &&
      this.mg.ticks() - this.markedTraitorTick <
        this.mg.config().traitorDuration()
    );
  }

  markTraitor(): void {
    this.markedTraitorTick = this.mg.ticks();

    // Record stats
    this.mg.stats().betray(this);
  }

  createAllianceRequest(recipient: Player): AllianceRequest | null {
    if (this.isAlliedWith(recipient)) {
      throw new Error(`cannot create alliance request, already allies`);
    }
    return this.mg.createAllianceRequest(this, recipient as Player);
  }

  relation(other: Player): Relation {
    if (other === this) {
      throw new Error(`cannot get relation with self: ${this}`);
    }
    const relation = this.relations.get(other) ?? 0;
    return this.relationFromValue(relation);
  }

  private relationFromValue(relationValue: number): Relation {
    if (relationValue < -50) {
      return Relation.Hostile;
    }
    if (relationValue < 0) {
      return Relation.Distrustful;
    }
    if (relationValue < 50) {
      return Relation.Neutral;
    }
    return Relation.Friendly;
  }

  allRelationsSorted(): { player: Player; relation: Relation }[] {
    return Array.from(this.relations, ([k, v]) => ({ player: k, relation: v }))
      .sort((a, b) => a.relation - b.relation)
      .map((r) => ({
        player: r.player,
        relation: this.relationFromValue(r.relation),
      }));
  }

  updateRelation(other: Player, delta: number): void {
    if (other === this) {
      throw new Error(`cannot update relation with self: ${this}`);
    }
    const relation = this.relations.get(other) ?? 0;
    const newRelation = within(relation + delta, -100, 100);
    this.relations.set(other, newRelation);
  }

  decayRelations() {
    this.relations.forEach((r: number, p: Player) => {
      const sign = -1 * Math.sign(r);
      const delta = 0.05;
      r += sign * delta;
      if (Math.abs(r) < delta * 2) {
        r = 0;
      }
      this.relations.set(p, r);
    });
  }

  canTarget(other: Player): boolean {
    if (this === other) {
      return false;
    }
    if (this.isFriendly(other)) {
      return false;
    }
    for (const t of this.targets_) {
      if (this.mg.ticks() - t.tick < this.mg.config().targetCooldown()) {
        return false;
      }
    }
    return true;
  }

  target(other: Player): void {
    this.targets_.push({ tick: this.mg.ticks(), target: other });
    this.mg.target(this, other);
  }

  targets(): Player[] {
    return this.targets_
      .filter(
        (t) => this.mg.ticks() - t.tick < this.mg.config().targetDuration(),
      )
      .map((t) => t.target);
  }

  transitiveTargets(): Player[] {
    const ts = this.alliances()
      .map((a) => a.other(this))
      .flatMap((ally) => ally.targets());
    ts.push(...this.targets());
    return [...new Set(ts)] as Player[];
  }

  sendEmoji(recipient: Player | typeof AllPlayers, emoji: string): void {
    if (recipient === this) {
      throw Error(`Cannot send emoji to oneself: ${this}`);
    }
    const msg: EmojiMessage = {
      message: emoji,
      senderID: this.smallID(),
      recipientID: recipient === AllPlayers ? recipient : recipient.smallID(),
      createdAt: this.mg.ticks(),
    };
    this.outgoingEmojis_.push(msg);
    this.mg.sendEmojiUpdate(msg);
  }

  outgoingEmojis(): EmojiMessage[] {
    return this.outgoingEmojis_
      .filter(
        (e) =>
          this.mg.ticks() - e.createdAt <
          this.mg.config().emojiMessageDuration(),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  canSendEmoji(recipient: Player | typeof AllPlayers): boolean {
    const recipientID =
      recipient === AllPlayers ? AllPlayers : recipient.smallID();
    const prevMsgs = this.outgoingEmojis_.filter(
      (msg) => msg.recipientID === recipientID,
    );
    for (const msg of prevMsgs) {
      if (
        this.mg.ticks() - msg.createdAt <
        this.mg.config().emojiMessageCooldown()
      ) {
        return false;
      }
    }
    return true;
  }

  canDonate(recipient: Player): boolean {
    if (!this.isFriendly(recipient)) {
      return false;
    }
    for (const donation of this.sentDonations) {
      if (donation.recipient === recipient) {
        if (
          this.mg.ticks() - donation.tick <
          this.mg.config().donateCooldown()
        ) {
          return false;
        }
      }
    }
    return true;
  }

  donateTroops(recipient: Player, troops: number): boolean {
    if (troops <= 0) return false;
    const removed = this.removeTroops(troops);
    if (removed === 0) return false;
    recipient.addTroops(removed);

    this.sentDonations.push(new Donation(recipient, this.mg.ticks()));
    this.mg.displayMessage(
      `Sent ${renderTroops(troops)} troops to ${recipient.name()}`,
      MessageType.INFO,
      this.id(),
    );
    this.mg.displayMessage(
      `Received ${renderTroops(troops)} troops from ${this.name()}`,
      MessageType.SUCCESS,
      recipient.id(),
    );
    return true;
  }

  donateGold(recipient: Player, gold: Gold): boolean {
    if (gold <= 0n) return false;
    const removed = this.removeGold(gold);
    if (removed === 0) return false;
    recipient.addGold(removed);

    this.sentDonations.push(new Donation(recipient, this.mg.ticks()));
    this.mg.displayMessage(
      `Sent ${renderNumber(gold)} gold to ${recipient.name()}`,
      MessageType.INFO,
      this.id(),
    );
    this.mg.displayMessage(
      `Received ${renderNumber(gold)} gold from ${this.name()}`,
      MessageType.SUCCESS,
      recipient.id(),
    );
    return true;
  }

  hasEmbargoAgainst(other: Player): boolean {
    return this.embargoes.has(other.id());
  }

  canTrade(other: Player): boolean {
    const embargo =
      other.hasEmbargoAgainst(this) || this.hasEmbargoAgainst(other);
    return !embargo && other.id() !== this.id();
  }

  addEmbargo(other: PlayerID, isTemporary: boolean): void {
    const embargo = this.embargoes.get(other);
    if (embargo !== undefined && !embargo.isTemporary) return;

    this.embargoes.set(other, {
      createdAt: this.mg.ticks(),
      isTemporary: isTemporary,
      target: other,
    });
  }

  getEmbargoes(): Embargo[] {
    return [...this.embargoes.values()];
  }

  stopEmbargo(other: PlayerID): void {
    this.embargoes.delete(other);
  }

  endTemporaryEmbargo(other: PlayerID): void {
    const embargo = this.embargoes.get(other);
    if (embargo !== undefined && !embargo.isTemporary) return;

    this.stopEmbargo(other);
  }

  tradingPartners(): Player[] {
    return this.mg
      .players()
      .filter((other) => other !== this && this.canTrade(other));
  }

  team(): Team | null {
    return this._team;
  }

  isOnSameTeam(other: Player): boolean {
    if (other === this) {
      return false;
    }
    if (this.team() === null || other.team() === null) {
      return false;
    }
    if (this.team() === ColoredTeams.Bot || other.team() === ColoredTeams.Bot) {
      return false;
    }
    return this._team === other.team();
  }

  isFriendly(other: Player): boolean {
    return this.isOnSameTeam(other) || this.isAlliedWith(other);
  }

  gold(): Gold {
    return this._gold;
  }

  addGold(toAdd: Gold): void {
    this._gold += toAdd;
  }

  removeGold(toRemove: Gold): Gold {
    if (toRemove <= 0n) {
      return 0;
    }
    const actualRemoved = Math.min(this._gold, toRemove);
    this._gold -= actualRemoved;
    return actualRemoved;
  }

  offensiveTroops(): number {
    let offensiveTroops = 0;
    for (const attack of this._outgoingAttacks) {
      offensiveTroops += attack.troops();
    }
    return Math.floor(offensiveTroops);
  }

  population(): number {
    this._offensiveTroops = Math.floor(this.offensiveTroops());
    this._troops = Math.floor(Math.max(0, this._troops));
    this._workers = Math.ceil(Math.max(1, this._workers));

    return Number(
      Math.floor(this._troops + this._workers + this.offensiveTroops()),
    );
  }
  workers(): number {
    return Math.floor(Math.max(1, Number(this._workers)));
  }
  addWorkers(toAdd: number): void {
    this._workers += toAdd;
  }
  removeWorkers(toRemove: number): void {
    this._workers = Math.max(1, this._workers - toRemove);
  }

  targetTroopRatio(): number {
    return Number(this._targetTroopRatio) / 100;
  }

  setTargetTroopRatio(target: number): void {
    if (target < 0 || target > 1) {
      throw new Error(
        `invalid targetTroopRatio ${target} set on player ${PlayerImpl}`,
      );
    }
    this._targetTroopRatio = target * 100;
  }

  reserveTroopRatio(): number {
    return Number(this._reserveTroopRatio) / 100;
  }

  setReserveTroopRatio(target: number): void {
    if (target < 0 || target > 1) {
      throw new Error(
        `invalid reserveTroopRatio ${target} set on player ${PlayerImpl}`,
      );
    }
    this._reserveTroopRatio = target * 100;
  }

  troops(): number {
    return Number(this._troops);
  }

  addTroops(troops: number): void {
    if (troops < 0) {
      this.removeTroops(-1 * troops);
      return;
    }
    this._troops += troops;
  }
  removeTroops(troops: number): number {
    if (troops <= 1) {
      return 0;
    }
    const toRemove = Math.min(this._troops, troops);
    this._troops -= toRemove;
    return Number(toRemove);
  }

  captureUnit(unit: Unit): void {
    if (unit.owner() === this) {
      throw new Error(`Cannot capture unit, ${this} already owns ${unit}`);
    }

    if (unit.type() === UnitType.ResearchLab) {
      unit.delete(true);
    } else {
      unit.setOwner(this);
    }
  }

  buildUnit<T extends UnitType>(
    type: T,
    spawnTile: TileRef,
    params: UnitParams<T>,
  ): Unit {
    if (this.mg.config().isUnitDisabled(type)) {
      throw new Error(
        `Attempted to build disabled unit ${type} at tile ${spawnTile} by player ${this.name()}`,
      );
    }

    const nextId = this.mg.nextUnitID();
    const unit: Unit = new UnitImpl(
      type,
      this.mg,
      spawnTile,
      nextId,
      this,
      params,
    );
    const cost = this.mg.unitInfo(type).cost(this);

    this._units.push(unit);
    this.removeGold(cost);
    this.removeTroops("troops" in params ? (params.troops ?? 0) : 0);
    this.mg.addUpdate(unit.toUpdate());
    this.mg.addUnit(unit);

    return unit;
  }

  public hasRequiredTechs(unitType: UnitType): boolean {
    switch (unitType) {
      case UnitType.Metropolis:
        return this._unlockedTechnologies.has("metros");
      default:
        return true;
    }
  }

  public buildableUnits(tile: TileRef): BuildableUnit[] {
    const validTiles = this.validStructureSpawnTiles(tile);
    return Object.values(UnitType).map((u) => {
      return {
        type: u,
        canBuild: this.mg.inSpawnPhase()
          ? false
          : this.canBuild(u, tile, validTiles),
        cost: this.mg.config().unitInfo(u).cost(this),
      } as BuildableUnit;
    });
  }

  canBuild(
    unitType: UnitType,
    targetTile: TileRef,
    validTiles: TileRef[] | null = null,
  ): TileRef | false {
    if (this.mg.config().isUnitDisabled(unitType)) {
      return false;
    }

    const cost = this.mg.unitInfo(unitType).cost(this);
    if (!this.isAlive() || this.gold() < cost) {
      return false;
    }

    if (this.hasRequiredTechs(unitType) === false) {
      return false;
    }

    switch (unitType) {
      case UnitType.MIRV:
        if (!this.mg.hasOwner(targetTile)) {
          return false;
        }
        return this.nukeSpawn(targetTile);
      case UnitType.CruiseMissile:
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
        return this.nukeSpawn(targetTile);
      case UnitType.MIRVWarhead:
        return targetTile;
      case UnitType.Port:
        return this.portSpawn(targetTile, validTiles);
      case UnitType.Warship:
        return this.warshipSpawn(targetTile);
      case UnitType.Shell:
      case UnitType.SAMMissile:
        return targetTile;
      case UnitType.TransportShip:
        return canBuildTransportShip(this.mg, this, targetTile);
      case UnitType.TradeShip:
        return this.tradeShipSpawn(targetTile);
      case UnitType.MissileSilo:
      case UnitType.DefensePost:
      case UnitType.Barracks:
      case UnitType.SAMLauncher:
      case UnitType.Radar:
      case UnitType.City:
      case UnitType.Metropolis:
      case UnitType.ResearchLab:
      case UnitType.PowerPlant:
      case UnitType.Hospital:
      case UnitType.Construction:
        return this.landBasedStructureSpawn(targetTile, validTiles);
      default:
        assertNever(unitType);
    }
  }

  nukeSpawn(tile: TileRef): TileRef | false {
    const owner = this.mg.owner(tile);
    if (owner.isPlayer()) {
      if (this.isOnSameTeam(owner)) {
        return false;
      }
    }
    // only get missilesilos that are not on cooldown
    const spawns = this.units(UnitType.MissileSilo)
      .filter((silo) => {
        return !silo?.isInCooldown();
      })
      .sort(distSortUnit(this.mg, tile));
    if (spawns.length === 0) {
      return false;
    }
    return spawns[0].tile();
  }

  portSpawn(tile: TileRef, validTiles: TileRef[] | null): TileRef | false {
    const spawns = Array.from(
      this.mg.bfs(
        tile,
        manhattanDistFN(tile, this.mg.config().radiusPortSpawn()),
      ),
    )
      .filter((t) => this.mg.owner(t) === this && this.mg.isOceanShore(t))
      .sort(
        (a, b) =>
          this.mg.manhattanDist(a, tile) - this.mg.manhattanDist(b, tile),
      );
    const validTileSet = new Set(
      validTiles ?? this.validStructureSpawnTiles(tile),
    );
    for (const t of spawns) {
      if (validTileSet.has(t)) {
        return t;
      }
    }
    return false;
  }

  warshipSpawn(tile: TileRef): TileRef | false {
    if (!this.mg.isOcean(tile)) {
      return false;
    }
    const spawns = this.units(UnitType.Port).sort(
      (a, b) =>
        this.mg.manhattanDist(a.tile(), tile) -
        this.mg.manhattanDist(b.tile(), tile),
    );
    if (spawns.length === 0) {
      return false;
    }
    return spawns[0].tile();
  }

  landBasedStructureSpawn(
    tile: TileRef,
    validTiles: TileRef[] | null = null,
  ): TileRef | false {
    const tiles = validTiles ?? this.validStructureSpawnTiles(tile);
    if (tiles.length === 0) {
      return false;
    }
    return tiles[0];
  }

  private validStructureSpawnTiles(tile: TileRef): TileRef[] {
    if (this.mg.owner(tile) !== this) {
      return [];
    }
    const searchRadius = 15;
    const searchRadiusSquared = searchRadius ** 2;
    const types = Object.values(UnitType).filter((unitTypeValue) => {
      return this.mg.config().unitInfo(unitTypeValue).territoryBound;
    });

    const nearbyUnits = this.mg
      .nearbyUnits(tile, searchRadius * 2, types)
      .map((u) => u.unit);
    const nearbyTiles = this.mg.bfs(tile, (gm, t) => {
      return (
        this.mg.euclideanDistSquared(tile, t) < searchRadiusSquared &&
        gm.ownerID(t) === this.smallID()
      );
    });
    const validSet: Set<TileRef> = new Set(nearbyTiles);

    const minDistSquared = this.mg.config().structureMinDist() ** 2;
    for (const t of nearbyTiles) {
      for (const unit of nearbyUnits) {
        if (this.mg.euclideanDistSquared(unit.tile(), t) < minDistSquared) {
          validSet.delete(t);
          break;
        }
      }
    }
    const valid = Array.from(validSet);
    valid.sort(
      (a, b) =>
        this.mg.euclideanDistSquared(a, tile) -
        this.mg.euclideanDistSquared(b, tile),
    );
    return valid;
  }

  tradeShipSpawn(targetTile: TileRef): TileRef | false {
    const spawns = this.units(UnitType.Port).filter(
      (u) => u.tile() === targetTile,
    );
    if (spawns.length === 0) {
      return false;
    }
    return spawns[0].tile();
  }
  lastTileChange(): Tick {
    return this._lastTileChange;
  }

  isDisconnected(): boolean {
    return this._isDisconnected;
  }

  markDisconnected(isDisconnected: boolean): void {
    this._isDisconnected = isDisconnected;
  }

  hash(): number {
    return (
      simpleHash(this.id()) * (this.population() + this.numTilesOwned()) +
      this._units.reduce((acc, unit) => acc + unit.hash(), 0)
    );
  }
  toString(): string {
    return `Player:{name:${this.info().name},clientID:${
      this.info().clientID
    },isAlive:${this.isAlive()},troops:${
      this._troops
    },numTileOwned:${this.numTilesOwned()}}]`;
  }

  techLevel(): number {
    return this._techLevel;
  }

  hasTech(techId: string): boolean {
    return this._unlockedTechnologies.has(techId);
  }

  unlockTech(techId: string): void {
    this._unlockedTechnologies.add(techId);
  }

  public playerProfile(): PlayerProfile {
    const rel = {
      relations: Object.fromEntries(
        this.allRelationsSorted().map(({ player, relation }) => [
          player.smallID(),
          relation,
        ]),
      ),
      alliances: this.alliances().map((a) => a.other(this).smallID()),
    };
    return rel;
  }

  createAttack(
    target: Player | TerraNullius,
    troops: number,
    sourceTile: TileRef | null,
    border: Set<number>,
  ): Attack {
    const attack = new AttackImpl(
      this._pseudo_random.nextID(),
      target,
      this,
      troops,
      sourceTile,
      border,
      this.mg,
    );
    this._outgoingAttacks.push(attack);
    if (target.isPlayer()) {
      (target as PlayerImpl)._incomingAttacks.push(attack);
    }
    return attack;
  }
  outgoingAttacks(): Attack[] {
    return this._outgoingAttacks;
  }
  incomingAttacks(): Attack[] {
    return this._incomingAttacks;
  }

  public canAttack(tile: TileRef): boolean {
    if (
      this.mg.hasOwner(tile) &&
      this.mg.config().numSpawnPhaseTurns() +
        this.mg.config().spawnImmunityDuration() >
        this.mg.ticks()
    ) {
      return false;
    }

    if (this.mg.owner(tile) === this) {
      return false;
    }
    if (this.mg.hasOwner(tile)) {
      const other = this.mg.owner(tile) as Player;
      if (this.isFriendly(other)) {
        return false;
      }
    }

    if (!this.mg.isLand(tile)) {
      return false;
    }
    if (this.mg.hasOwner(tile)) {
      return this.sharesBorderWith(this.mg.owner(tile));
    } else {
      for (const t of this.mg.bfs(
        tile,
        andFN(
          (gm, t) => !gm.hasOwner(t) && gm.isLand(t),
          manhattanDistFN(tile, 200),
        ),
      )) {
        for (const n of this.mg.neighbors(t)) {
          if (this.mg.owner(n) === this) {
            return true;
          }
        }
      }
      return false;
    }
  }

  bestTransportShipSpawn(targetTile: TileRef): TileRef | false {
    return bestShoreDeploymentSource(this.mg, this, targetTile);
  }

  // It's a probability list, so if an element appears twice it's because it's
  // twice more likely to be picked later.
  tradingPorts(port: Unit): Unit[] {
    const ports = this.mg
      .players()
      .filter((p) => p !== port.owner() && p.canTrade(port.owner()))
      .flatMap((p) => p.units(UnitType.Port))
      .sort((p1, p2) => {
        return (
          this.mg.manhattanDist(port.tile(), p1.tile()) -
          this.mg.manhattanDist(port.tile(), p2.tile())
        );
      });

    // Make close ports twice more likely by putting them again
    for (
      let i = 0;
      i < this.mg.config().proximityBonusPortsNb(ports.length);
      i++
    ) {
      ports.push(ports[i]);
    }

    // Make ally ports twice more likely by putting them again
    this.mg
      .players()
      .filter((p) => p !== port.owner() && p.canTrade(port.owner()))
      .filter((p) => p.isAlliedWith(port.owner()))
      .flatMap((p) => p.units(UnitType.Port))
      .forEach((p) => ports.push(p));

    return ports;
  }
}
