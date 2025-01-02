import { MessageType } from "../client/graphics/layers/EventsDisplay";
import { Config } from "./configuration/Config";
import { Alliance, AllianceRequest, AllPlayers, Cell, DefenseBonus, EmojiMessage, Execution, ExecutionView, Game, Gold, Nation, Player, PlayerID, PlayerInfo, PlayerType, Relation, TerrainMap, TerrainTile, TerrainType, TerraNullius, Tick, Tile, Unit, UnitInfo, UnitType } from "./game/Game";
import { GameUpdateViewData, PlayerViewData, TileViewData, UnitViewData } from "./GameViewData";
import { ClientID } from "./Schemas";

export class TileView implements Tile {
    constructor(private data: TileViewData, terrain: TerrainTile) { }
    isLand(): boolean {
        throw new Error("Method not implemented.");
    }
    isShore(): boolean {
        throw new Error("Method not implemented.");
    }
    isOceanShore(): boolean {
        throw new Error("Method not implemented.");
    }
    isWater(): boolean {
        throw new Error("Method not implemented.");
    }
    isShorelineWater(): boolean {
        throw new Error("Method not implemented.");
    }
    isOcean(): boolean {
        throw new Error("Method not implemented.");
    }
    isLake(): boolean {
        throw new Error("Method not implemented.");
    }
    terrain(): TerrainTile {
        throw new Error("Method not implemented.");
    }
    magnitude(): number {
        throw new Error("Method not implemented.");
    }
    owner(): Player | TerraNullius {
        throw new Error("Method not implemented.");
    }
    hasOwner(): boolean {
        throw new Error("Method not implemented.");
    }
    isBorder(): boolean {
        throw new Error("Method not implemented.");
    }
    borders(other: Player | TerraNullius): boolean {
        throw new Error("Method not implemented.");
    }
    isInterior(): boolean {
        throw new Error("Method not implemented.");
    }
    cell(): Cell {
        throw new Error("Method not implemented.");
    }
    neighbors(): Tile[] {
        throw new Error("Method not implemented.");
    }
    neighborsWrapped(): Tile[] {
        throw new Error("Method not implemented.");
    }
    onShore(): boolean {
        throw new Error("Method not implemented.");
    }
    defenseBonuses(): DefenseBonus[] {
        throw new Error("Method not implemented.");
    }
    defenseBonus(player: Player): number {
        throw new Error("Method not implemented.");
    }
    hasFallout(): boolean {
        throw new Error("Method not implemented.");
    }
    cost(): number {
        throw new Error("Method not implemented.");
    }
    type(): TerrainType {
        throw new Error("Method not implemented.");
    }
}

export class UnitView implements Unit {
    constructor(private data: UnitViewData) { }

    type(): UnitType {
        throw new Error("Method not implemented.");
    }
    troops(): number {
        throw new Error("Method not implemented.");
    }
    tile(): Tile {
        throw new Error("Method not implemented.");
    }
    owner(): Player {
        throw new Error("Method not implemented.");
    }
    isActive(): boolean {
        throw new Error("Method not implemented.");
    }
    info(): UnitInfo {
        throw new Error("Method not implemented.");
    }
    hasHealth(): boolean {
        throw new Error("Method not implemented.");
    }
    health(): number {
        throw new Error("Method not implemented.");
    }
}

export class PlayerView implements Player {
    constructor(private data: PlayerViewData) { }
    info(): PlayerInfo {
        throw new Error("Method not implemented.");
    }
    name(): string {
        throw new Error("Method not implemented.");
    }
    displayName(): string {
        throw new Error("Method not implemented.");
    }
    clientID(): ClientID {
        throw new Error("Method not implemented.");
    }
    id(): PlayerID {
        throw new Error("Method not implemented.");
    }
    type(): PlayerType {
        throw new Error("Method not implemented.");
    }
    units(...types: UnitType[]): Unit[] {
        throw new Error("Method not implemented.");
    }
    ownsTile(cell: Cell): boolean {
        throw new Error("Method not implemented.");
    }
    isAlive(): boolean {
        throw new Error("Method not implemented.");
    }
    borderTiles(): ReadonlySet<Tile> {
        throw new Error("Method not implemented.");
    }
    isPlayer(): this is Player {
        throw new Error("Method not implemented.");
    }
    neighbors(): (Player | TerraNullius)[] {
        throw new Error("Method not implemented.");
    }
    numTilesOwned(): number {
        throw new Error("Method not implemented.");
    }
    tiles(): ReadonlySet<Tile> {
        throw new Error("Method not implemented.");
    }
    sharesBorderWith(other: Player | TerraNullius): boolean {
        throw new Error("Method not implemented.");
    }
    incomingAllianceRequests(): AllianceRequest[] {
        throw new Error("Method not implemented.");
    }
    outgoingAllianceRequests(): AllianceRequest[] {
        throw new Error("Method not implemented.");
    }
    alliances(): Alliance[] {
        throw new Error("Method not implemented.");
    }
    allies(): Player[] {
        throw new Error("Method not implemented.");
    }
    isAlliedWith(other: Player): boolean {
        throw new Error("Method not implemented.");
    }
    allianceWith(other: Player): Alliance | null {
        throw new Error("Method not implemented.");
    }
    recentOrPendingAllianceRequestWith(other: Player): boolean {
        throw new Error("Method not implemented.");
    }
    relation(other: Player): Relation {
        throw new Error("Method not implemented.");
    }
    allRelationsSorted(): { player: Player; relation: Relation; }[] {
        throw new Error("Method not implemented.");
    }
    isTraitor(): boolean {
        throw new Error("Method not implemented.");
    }
    canTarget(other: Player): boolean {
        throw new Error("Method not implemented.");
    }
    targets(): Player[] {
        throw new Error("Method not implemented.");
    }
    transitiveTargets(): Player[] {
        throw new Error("Method not implemented.");
    }
    toString(): string {
        throw new Error("Method not implemented.");
    }
    canSendEmoji(recipient: Player | typeof AllPlayers): boolean {
        throw new Error("Method not implemented.");
    }
    outgoingEmojis(): EmojiMessage[] {
        throw new Error("Method not implemented.");
    }
    canDonate(recipient: Player): boolean {
        throw new Error("Method not implemented.");
    }
    gold(): Gold {
        throw new Error("Method not implemented.");
    }
    population(): number {
        throw new Error("Method not implemented.");
    }
    workers(): number {
        throw new Error("Method not implemented.");
    }
    targetTroopRatio(): number {
        throw new Error("Method not implemented.");
    }
    troops(): number {
        throw new Error("Method not implemented.");
    }
    canBuild(type: UnitType, targetTile: Tile): Tile | false {
        throw new Error("Method not implemented.");
    }
    lastTileChange(): Tick {
        throw new Error("Method not implemented.");
    }
}

export class GameView implements Game {
    private lastGameUpdate: GameUpdateViewData
    private tiles: TileViewData[][] = []

    constructor(private _terrainMap: TerrainMap) { }
    executions(): ExecutionView[] {
        throw new Error("Method not implemented.");
    }
    executeNextTick(): void {
        throw new Error("Method not implemented.");
    }

    public update(gu: GameUpdateViewData) {
        this.lastGameUpdate = gu
        gu.tileUpdates.forEach(tu => {
            this.tiles[tu.x][tu.y] = tu
        })
    }

    recentlyUpdatedTiles(): TileView[] {
        return this.lastGameUpdate.tileUpdates.map(tu => new TileView(tu, this._terrainMap.terrain(new Cell(tu.x, tu.y))))
    }

    player(id: PlayerID): Player {
        throw new Error("Method not implemented.");
    }
    playerByClientID(id: ClientID): Player | null {
        throw new Error("Method not implemented.");
    }
    hasPlayer(id: PlayerID): boolean {
        throw new Error("Method not implemented.");
    }
    players(): Player[] {
        throw new Error("Method not implemented.");
    }
    tile(cell: Cell): Tile {
        throw new Error("Method not implemented.");
    }
    isOnMap(cell: Cell): boolean {
        throw new Error("Method not implemented.");
    }
    neighbors(cell: Cell | Tile): Tile[] {
        throw new Error("Method not implemented.");
    }
    width(): number {
        throw new Error("Method not implemented.");
    }
    height(): number {
        throw new Error("Method not implemented.");
    }
    numLandTiles(): number {
        throw new Error("Method not implemented.");
    }
    forEachTile(fn: (tile: Tile) => void): void {
        throw new Error("Method not implemented.");
    }
    terraNullius(): TerraNullius {
        throw new Error("Method not implemented.");
    }
    ticks(): Tick {
        throw new Error("Method not implemented.");
    }
    inSpawnPhase(): boolean {
        throw new Error("Method not implemented.");
    }
    addExecution(...exec: Execution[]): void {
        throw new Error("Method not implemented.");
    }
    nations(): Nation[] {
        throw new Error("Method not implemented.");
    }
    config(): Config {
        throw new Error("Method not implemented.");
    }
    displayMessage(message: string, type: MessageType, playerID: PlayerID | null): void {
        throw new Error("Method not implemented.");
    }
    units(...types: UnitType[]): Unit[] {
        throw new Error("Method not implemented.");
    }
    unitInfo(type: UnitType): UnitInfo {
        throw new Error("Method not implemented.");
    }
    terrainMap(): TerrainMap {
        throw new Error("Method not implemented.");
    }
    terrainMiniMap(): TerrainMap {
        throw new Error("Method not implemented.");
    }
}