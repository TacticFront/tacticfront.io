import { utcDay } from "d3";
import { placeName } from "../client/graphics/NameBoxCalculator";
import { getConfig } from "./configuration/Config";
import { EventBus } from "./EventBus";
import { Executor } from "./execution/ExecutionManager";
import { WinCheckExecution } from "./execution/WinCheckExecution";
import { AllPlayers, Cell, Game, GameUpdates, MessageType, Player, PlayerActions, PlayerID, PlayerProfile, PlayerType, UnitType } from "./game/Game";
import { DisplayMessageUpdate, ErrorUpdate } from "./game/GameUpdates";
import { NameViewData } from './game/Game';
import { GameUpdateType } from "./game/GameUpdates";
import { createGame } from "./game/GameImpl";
import { loadTerrainMap as loadGameMap } from "./game/TerrainMapLoader";
import { GameConfig, Turn } from "./Schemas";
import { GameUpdateViewData } from './game/GameUpdates';
import { andFN, manhattanDistFN, TileRef } from "./game/GameMap";
import { targetTransportTile } from "./Util";

export async function createGameRunner(gameID: string, gameConfig: GameConfig, callBack: (gu: GameUpdateViewData) => void): Promise<GameRunner> {
    const config = getConfig(gameConfig)
    const gameMap = await loadGameMap(gameConfig.gameMap);
    const game = createGame(gameMap.gameMap, gameMap.miniGameMap, gameMap.nationMap, config)
    const gr = new GameRunner(game as Game, new Executor(game, gameID), callBack)
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
        public game: Game,
        private execManager: Executor,
        private callBack: (gu: GameUpdateViewData | ErrorUpdate) => void
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

        let updates: GameUpdates;

        try {
            updates = this.game.executeNextTick();
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Game tick error:', error.message);
                this.callBack({
                    errMsg: error.message,
                    stack: error.stack
                } as ErrorUpdate)
                clearInterval(this.tickInterval)
                return
            }
        }

        if (this.game.inSpawnPhase() && this.game.ticks() % 2 == 0) {
            this.game.players()
                .filter(p => p.type() == PlayerType.Human || p.type() == PlayerType.FakeHuman)
                .forEach(p => this.playerViewData[p.id()] = placeName(this.game, p))
        }

        if (this.game.ticks() < 3 || this.game.ticks() % 30 == 0) {
            this.game.players().forEach(p => {
                this.playerViewData[p.id()] = placeName(this.game, p)
            })
        }

        // Many tiles are updated to pack it into an array
        const packedTileUpdates = updates[GameUpdateType.Tile].map(u => u.update)
        updates[GameUpdateType.Tile] = []

        this.callBack({
            tick: this.game.ticks(),
            packedTileUpdates: new BigUint64Array(packedTileUpdates),
            updates: updates,
            playerNameViewData: this.playerViewData
        })
        this.isExecuting = false
    }

    public playerActions(playerID: PlayerID, x: number, y: number): PlayerActions {
        const player = this.game.player(playerID)
        const tile = this.game.ref(x, y)
        const actions = {
            canBoat: this.canBoat(player, tile),
            canAttack: this.canAttack(player, tile),
            buildableUnits: Object.values(UnitType).filter(ut => player.canBuild(ut, tile) != false),
            canSendEmojiAllPlayers: player.canSendEmoji(AllPlayers)
        } as PlayerActions

        if (this.game.hasOwner(tile)) {
            const other = this.game.owner(tile) as Player
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
        const player = this.game.players().filter(p => p.smallID() == playerID)[0];
        if (!player) {
            throw new Error(`player with id ${playerID} not found`);
        }

        const rel = {
            relations: Object.fromEntries(
                player.allRelationsSorted()
                    .map(({ player, relation }) => [player.smallID(), relation])
            ),
            alliances: player.alliances().map(a => a.other(player).smallID())
        };
        return rel
    }

    private canBoat(myPlayer: Player, tile: TileRef): boolean {
        const other = this.game.owner(tile)
        if (myPlayer.units(UnitType.TransportShip).length >= this.game.config().boatMaxNumber()) {
            return false
        }

        let myPlayerBordersOcean = false
        for (const bt of myPlayer.borderTiles()) {
            if (this.game.isOceanShore(bt)) {
                myPlayerBordersOcean = true
                break
            }
        }
        let otherPlayerBordersOcean = false
        if (!this.game.hasOwner(tile)) {
            otherPlayerBordersOcean = true
        } else {
            for (const bt of (other as Player).borderTiles()) {
                if (this.game.isOceanShore(bt)) {
                    otherPlayerBordersOcean = true
                    break
                }
            }
        }

        if (other.isPlayer() && myPlayer.allianceWith(other)) {
            return false
        }

        let nearOcean = false
        for (const t of this.game.bfs(tile, andFN((gm, t) => gm.ownerID(t) == gm.ownerID(tile) && gm.isLand(t), manhattanDistFN(tile, 25)))) {
            if (this.game.isOceanShore(t)) {
                nearOcean = true
                break
            }
        }
        if (!nearOcean) {
            return false
        }

        if (myPlayerBordersOcean && otherPlayerBordersOcean) {
            const dst = targetTransportTile(this.game, tile)
            if (dst != null) {
                if (myPlayer.canBuild(UnitType.TransportShip, dst)) {
                    return true
                }
            }
        }
    }

    private canAttack(myPlayer: Player, tile: TileRef): boolean {
        if (this.game.owner(tile) == myPlayer) {
            return false
        }
        // TODO: fix event bus
        if (this.game.hasOwner(tile) && myPlayer.isAlliedWith(this.game.owner(tile) as Player)) {
            // this.eventBus.emit(new DisplayMessageEvent("Cannot attack ally", MessageType.WARN))
            return false
        }
        if (!this.game.isLand(tile)) {
            return false
        }
        if (this.game.hasOwner(tile)) {
            return myPlayer.sharesBorderWith(this.game.owner(tile))
        } else {
            for (const t of this.game.bfs(tile, andFN((gm, t) => !gm.hasOwner(t) && gm.isLand(t), manhattanDistFN(tile, 200)))) {
                for (const n of this.game.neighbors(t)) {
                    if (this.game.owner(n) == myPlayer) {
                        return true
                    }
                }
            }
            return false
        }
    }
}
