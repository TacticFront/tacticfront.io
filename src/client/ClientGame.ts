import {Executor} from "../core/execution/ExecutionManager";
import {Cell, MutableGame, PlayerEvent, PlayerID, MutablePlayer, TileEvent, Player, Game, BoatEvent, Tile, PlayerType} from "../core/Game";
import {createGame} from "../core/GameImpl";
import {EventBus} from "../core/EventBus";
import {Config} from "../core/configuration/Config";
import {GameRenderer} from "./graphics/GameRenderer";
import {InputHandler, MouseUpEvent, ZoomEvent, DragEvent, MouseDownEvent} from "./InputHandler"
import {ClientID, ClientIntentMessageSchema, ClientJoinMessageSchema, ClientLeaveMessageSchema, ClientMessageSchema, GameID, Intent, ServerMessage, ServerMessageSchema, ServerSyncMessage, Turn} from "../core/Schemas";
import {TerrainMap} from "../core/TerrainMapLoader";
import {and, bfs, dist, manhattanDist} from "../core/Util";
import {TerrainRenderer} from "./graphics/TerrainRenderer";



export function createClientGame(name: string, clientID: ClientID, playerID: PlayerID, ip: string | null, gameID: GameID, config: Config, terrainMap: TerrainMap): ClientGame {
    let eventBus = new EventBus()
    let game = createGame(terrainMap, eventBus, config)
    let terrainRenderer = new TerrainRenderer(game)
    let gameRenderer = new GameRenderer(game, clientID, terrainRenderer)

    return new ClientGame(
        name,
        clientID,
        playerID,
        ip,
        gameID,
        eventBus,
        game,
        gameRenderer,
        new InputHandler(eventBus),
        new Executor(game, gameID)
    )
}

export class ClientGame {
    private myPlayer: Player
    private turns: Turn[] = []
    private socket: WebSocket
    private isActive = false

    private currTurn = 0


    private intervalID: NodeJS.Timeout

    private isProcessingTurn = false


    constructor(
        public playerName: string,
        private id: ClientID,
        private playerID: PlayerID,
        private clientIP: string | null,
        private gameID: GameID,
        private eventBus: EventBus,
        private gs: Game,
        private renderer: GameRenderer,
        private input: InputHandler,
        private executor: Executor
    ) { }

    public join() {
        const wsHost = process.env.WEBSOCKET_URL || window.location.host;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.socket = new WebSocket(`${wsProtocol}//${wsHost}`)
        this.socket.onopen = () => {
            console.log('Connected to game server!');
            this.socket.send(
                JSON.stringify(
                    ClientJoinMessageSchema.parse({
                        type: "join",
                        gameID: this.gameID,
                        clientID: this.id,
                        clientIP: this.clientIP,
                        lastTurn: this.turns.length
                    })
                )
            )
        };
        this.socket.onmessage = (event: MessageEvent) => {
            const message: ServerMessage = ServerMessageSchema.parse(JSON.parse(event.data))
            if (message.type == "start") {
                console.log("starting game!")
                for (const turn of message.turns) {
                    if (turn.turnNumber < this.turns.length) {
                        continue
                    }
                    this.turns.push(turn)
                }
                if (!this.isActive) {
                    this.start()
                }
                this.sendIntent({
                    type: "updateName",
                    name: this.playerName,
                    clientID: this.id
                })
            }
            if (message.type == "turn") {
                this.addTurn(message.turn)
            }
        };
        this.socket.onerror = (err) => {
            console.error('Socket encountered error: ', err, 'Closing socket');
            this.socket.close();
        };
        this.socket.onclose = (event: CloseEvent) => {
            console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
            if (!this.isActive) {
                return
            }
            if (event.code != 1000) {
                this.join()
            }
        };

    }

    public start() {
        console.log('version 3')
        this.isActive = true
        // TODO: make each class do this, or maybe have client intercept all requests?
        //this.eventBus.on(TickEvent, (e) => this.tick(e))
        this.eventBus.on(TileEvent, (e) => this.renderer.tileUpdate(e))
        this.eventBus.on(PlayerEvent, (e) => this.playerEvent(e))
        this.eventBus.on(BoatEvent, (e) => this.renderer.boatEvent(e))
        this.eventBus.on(MouseUpEvent, (e) => this.inputEvent(e))
        this.eventBus.on(ZoomEvent, (e) => this.renderer.onZoom(e))
        this.eventBus.on(DragEvent, (e) => this.renderer.onMove(e))

        this.renderer.initialize()
        this.input.initialize()
        this.gs.addExecution(...this.executor.spawnBots(this.gs.config().numBots()))
        console.log('!!! number fake humans ')
        this.gs.addExecution(...this.executor.fakeHumanExecutions(this.gs.config().numFakeHumans(this.gameID)))

        this.intervalID = setInterval(() => this.tick(), 10);
    }

    public stop() {
        clearInterval(this.intervalID)
        this.isActive = false
        if (this.socket.readyState === WebSocket.OPEN) {
            console.log('on stop: leaving game')
            const msg = ClientLeaveMessageSchema.parse({
                type: "leave",
                clientID: this.id,
                gameID: this.gameID,
            })
            this.socket.send(JSON.stringify(msg))
        } else {
            console.log('WebSocket is not open. Current state:', this.socket.readyState);
            console.log('attempting reconnect')
        }
    }

    public addTurn(turn: Turn): void {
        if (this.turns.length != turn.turnNumber) {
            console.error(`got wrong turn have turns ${this.turns.length}, received turn ${turn.turnNumber}`)
        }
        this.turns.push(turn)
    }

    public tick() {
        if (this.currTurn >= this.turns.length || this.isProcessingTurn) {
            return
        }
        this.isProcessingTurn = true
        this.gs.addExecution(...this.executor.createExecs(this.turns[this.currTurn]))
        this.gs.tick()
        this.renderer.tick()
        this.currTurn++
        this.isProcessingTurn = false
    }

    private playerEvent(event: PlayerEvent) {
        console.log('received new player event!')
        if (event.player.clientID() == this.id) {
            console.log('setting name')
            this.myPlayer = event.player
        }
        this.renderer.playerEvent(event)
    }

    private inputEvent(event: MouseUpEvent) {
        if (!this.isActive) {
            return
        }
        const cell = this.renderer.screenToWorldCoordinates(event.x, event.y)
        if (!this.gs.isOnMap(cell)) {
            return
        }
        const tile = this.gs.tile(cell)
        if (tile.isLand() && !tile.hasOwner() && this.gs.inSpawnPhase()) {
            this.sendSpawnIntent(cell)
            return
        }
        if (this.gs.inSpawnPhase()) {
            return
        }
        if (this.myPlayer == null) {
            return
        }

        const owner = tile.owner()
        const targetID = owner.isPlayer() ? owner.id() : null;

        if (tile.owner() == this.myPlayer) {
            return
        }

        let bordersOcean = false
        let bordersEnemy = false
        if (tile.isLand()) {
            const bordersWithDists: Tile[] = []
            for (const border of this.myPlayer.borderTiles()) {
                if (border.isOceanShore()) {
                    bordersOcean = true
                }
                for (const n of border.neighbors()) {
                    if (n.owner() == tile.owner()) {
                        bordersWithDists.push(n)
                        bordersEnemy = true
                    }
                }
            }

            // Border with enemy sorted by distance to click tile.
            const borderWithDists = bordersWithDists.map(t => ({
                dist: manhattanDist(t.cell(), tile.cell()),
                tile: t
            })).sort((a, b) => a.dist - b.dist);

            const enemyShoreDists = Array.from(bfs(
                tile,
                and((t) => t.isLand() && t.owner() == tile.owner(), dist(tile, 10))
            )).filter(t => t.isOceanShore()).map(t => ({
                dist: manhattanDist(t.cell(), tile.cell()),
                tile: t
            })).sort((a, b) => a.dist - b.dist);

            if (!bordersEnemy && !bordersOcean) {
                return
            }

            let borderTileClosest = 10000000
            let enemyShoreClosest = 10000
            if (borderWithDists.length == 0 && enemyShoreDists.length == 0) {
                return
            }

            if (bordersWithDists.length > 0) {
                borderTileClosest = borderWithDists[0].dist
            }
            if (enemyShoreDists.length > 0) {
                enemyShoreClosest = enemyShoreDists[0].dist
            }
            if (enemyShoreClosest < borderTileClosest / 6) {
                this.sendBoatAttackIntent(targetID, enemyShoreDists[0].tile.cell(), this.gs.config().boatAttackAmount(this.myPlayer, owner))
            } else {
                this.sendAttackIntent(targetID, cell, this.gs.config().attackAmount(this.myPlayer, owner))
            }
        }

        if (tile.isOcean()) {
            const bordersOcean = Array.from(this.myPlayer.borderTiles()).filter(t => t.isOceanShore()).length > 0
            if (!bordersOcean) {
                return
            }
            const tn = Array.from(bfs(tile, dist(tile, 10)))
                .filter(t => t.isOceanShore())
                .sort((a, b) => manhattanDist(tile.cell(), a.cell()) - manhattanDist(tile.cell(), b.cell()))
            if (tn.length > 0) {
                this.sendBoatAttackIntent(targetID, tn[0].cell(), this.gs.config().boatAttackAmount(this.myPlayer, owner))
            }
        }
    }

    private sendSpawnIntent(cell: Cell) {
        this.sendIntent({
            type: "spawn",
            clientID: this.id,
            playerID: this.playerID,
            name: this.playerName,
            playerType: PlayerType.Human,
            x: cell.x,
            y: cell.y
        })
    }

    private sendAttackIntent(targetID: PlayerID, cell: Cell, troops: number) {
        this.sendIntent({
            type: "attack",
            clientID: this.id,
            attackerID: this.myPlayer.id(),
            targetID: targetID,
            troops: troops,
            sourceX: null,
            sourceY: null,
            targetX: cell.x,
            targetY: cell.y
        })
    }

    private sendBoatAttackIntent(targetID: PlayerID, cell: Cell, troops: number) {
        this.sendIntent({
            type: "boat",
            clientID: this.id,
            attackerID: this.myPlayer.id(),
            targetID: targetID,
            troops: troops,
            x: cell.x,
            y: cell.y,
        })
    }

    private sendIntent(intent: Intent) {
        if (this.socket.readyState === WebSocket.OPEN) {
            const msg = ClientIntentMessageSchema.parse({
                type: "intent",
                clientID: this.id,
                gameID: this.gameID,
                intent: intent
            })
            this.socket.send(JSON.stringify(msg))
        } else {
            console.log('WebSocket is not open. Current state:', this.socket.readyState);
            console.log('attempting reconnect')
        }
    }

}