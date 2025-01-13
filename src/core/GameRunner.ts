import { utcDay } from "d3";
import { placeName } from "../client/graphics/NameBoxCalculator";
import { getConfig } from "./configuration/Config";
import { EventBus } from "./EventBus";
import { Executor } from "./execution/ExecutionManager";
import { WinCheckExecution } from "./execution/WinCheckExecution";
import { Cell, DisplayMessageUpdate, Game, GameUpdateType, MessageType, MutableGame, MutableTile, NameViewData, Player, PlayerActions, PlayerID, PlayerProfile, Tile, TileUpdate, UnitType, UnitUpdate } from "./game/Game";
import { createGame } from "./game/GameImpl";
import { loadTerrainMap } from "./game/TerrainMapLoader";
import { GameConfig, Turn } from "./Schemas";
import { and, bfs, dist, targetTransportTile } from "./Util";
import { GameUpdateViewData, packTileData } from "./GameView";

export async function createGameRunner(gameID: string, gameConfig: GameConfig, callBack: (gu: GameUpdateViewData) => void): Promise<GameRunner> {
    const config = getConfig(gameConfig)
    const terrainMap = await loadTerrainMap(gameConfig.gameMap);
    const game = createGame(terrainMap.map, terrainMap.miniMap, config)
    const gr = new GameRunner(game as MutableGame, new Executor(game, gameID), callBack)
    gr.init()
    return gr
}

export class GameRunner {
    private tickInterval = null
    private turns: Turn[] = []
    private currTurn = 0
    private isExecuting = false

    private playerViewData: Record<PlayerID, NameViewData> = {}

    constructor(
        public game: MutableGame,
        private execManager: Executor,
        private callBack: (gu: GameUpdateViewData) => void
    ) {
    }

    init() {
        this.game.addExecution(...this.execManager.spawnBots(this.game.config().numBots()))
        if (this.game.config().spawnNPCs()) {
            this.game.addExecution(...this.execManager.fakeHumanExecutions())
        }
        this.game.addExecution(new WinCheckExecution())
        this.tickInterval = setInterval(() => this.executeNextTick(), 10)
    }

    public addTurn(turn: Turn): void {
        this.turns.push(turn)
    }

    public executeNextTick() {
        if (this.isExecuting) {
            return
        }
        if (this.currTurn >= this.turns.length) {
            return
        }
        this.isExecuting = true


        this.game.addExecution(...this.execManager.createExecs(this.turns[this.currTurn]))
        this.currTurn++
        const updates = this.game.executeNextTick()

        if (this.game.inSpawnPhase() || this.game.ticks() % 20 == 0) {
            this.game.players().forEach(p => {
                this.playerViewData[p.id()] = placeName(this.game, p)
            })
        }

        // Many tiles are updated to pack it into an array
        const packedTileUpdates = updates[GameUpdateType.Tile].map(u => packTileData(u as TileUpdate))
        updates[GameUpdateType.Tile] = []

        this.callBack({
            tick: this.game.ticks(),
            packedTileUpdates: packedTileUpdates,
            updates: updates,
            playerNameViewData: this.playerViewData
        })
        this.isExecuting = false
    }

    public playerActions(playerID: PlayerID, x: number, y: number): PlayerActions {
        const player = this.game.player(playerID)
        const tile = this.game.tile(new Cell(x, y))
        const actions = {
            canBoat: this.canBoat(player, tile),
            canAttack: this.canAttack(player, tile),
            buildableUnits: Object.values(UnitType).filter(ut => player.canBuild(ut, tile) != false)
        } as PlayerActions

        if (tile.hasOwner()) {
            const other = tile.owner() as Player
            actions.interaction = {
                sharedBorder: player.sharesBorderWith(other),
                canSendEmoji: player.canSendEmoji(other),
                canTarget: player.canTarget(other),
                canSendAllianceRequest: !player.recentOrPendingAllianceRequestWith(other),
                canBreakAlliance: player.isAlliedWith(other),
                canDonate: player.canDonate(other)
            }
        }

        return actions
    }

    public playerProfile(playerID: number): PlayerProfile {
        return {
            relations: this.game.players().filter(p => p.smallID() == playerID)[0]?.allRelationsSorted()
        }
    }

    private canBoat(myPlayer: Player, tile: Tile): boolean {
        const other = tile.owner()
        if (myPlayer.units(UnitType.TransportShip).length >= this.game.config().boatMaxNumber()) {
            return false
        }

        let myPlayerBordersOcean = false
        for (const bt of myPlayer.borderTiles()) {
            if (bt.terrain().isOceanShore()) {
                myPlayerBordersOcean = true
                break
            }
        }
        let otherPlayerBordersOcean = false
        if (!tile.hasOwner()) {
            otherPlayerBordersOcean = true
        } else {
            for (const bt of (other as Player).borderTiles()) {
                if (bt.terrain().isOceanShore()) {
                    otherPlayerBordersOcean = true
                    break
                }
            }
        }

        if (other.isPlayer() && myPlayer.allianceWith(other)) {
            return false
        }

        let nearOcean = false
        for (const t of bfs(tile, and(t => t.owner() == tile.owner() && t.terrain().isLand(), dist(tile, 25)))) {
            if (t.terrain().isOceanShore()) {
                nearOcean = true
                break
            }
        }
        if (!nearOcean) {
            return false
        }

        if (myPlayerBordersOcean && otherPlayerBordersOcean) {
            const dst = targetTransportTile(this.game.width(), tile)
            if (dst != null) {
                if (myPlayer.canBuild(UnitType.TransportShip, dst)) {
                    return true
                }
            }
        }
    }

    private canAttack(myPlayer: Player, tile: Tile): boolean {
        if (tile.owner() == myPlayer) {
            return false
        }
        // TODO: fix event bus
        if (tile.owner().isPlayer() && myPlayer.isAlliedWith(tile.owner() as Player)) {
            // this.eventBus.emit(new DisplayMessageEvent("Cannot attack ally", MessageType.WARN))
            return false
        }
        if (!tile.terrain().isLand()) {
            return false
        }
        if (tile.hasOwner()) {
            return myPlayer.sharesBorderWith(tile.owner())
        } else {
            for (const t of bfs(tile, and(t => !t.hasOwner() && t.terrain().isLand(), dist(tile, 200)))) {
                for (const n of t.neighbors()) {
                    if (n.owner() == myPlayer) {
                        return true
                    }
                }
            }
            return false
        }
    }
}
