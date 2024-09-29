import {Executor} from "../core/execution/ExecutionManager";
import {Cell, MutableGame, PlayerEvent, PlayerID, MutablePlayer, TileEvent, Player, Game, BoatEvent, Tile, PlayerType} from "../core/game/Game";
import {createGame} from "../core/game/GameImpl";
import {EventBus} from "../core/EventBus";
import {Config} from "../core/configuration/Config";
import {createRenderer, GameRenderer} from "./graphics/GameRenderer";
import {InputHandler, MouseUpEvent, ZoomEvent, DragEvent, MouseDownEvent} from "./InputHandler"
import {ClientID, ClientIntentMessageSchema, ClientJoinMessageSchema, ClientLeaveMessageSchema, ClientMessageSchema, GameID, Intent, ServerMessage, ServerMessageSchema, ServerSyncMessage, Turn} from "../core/Schemas";
import {TerrainMap} from "../core/game/TerrainMapLoader";
import {and, bfs, dist, manhattanDist} from "../core/Util";
import {TerrainLayer} from "./graphics/layers/TerrainLayer";
import {WinCheckExecution} from "../core/execution/WinCheckExecution";
import {SendAttackIntentEvent, SendBoatAttackIntentEvent, SendBreakAllianceIntentEvent, SendSpawnIntentEvent, Transport} from "./Transport";
import {createCanvas} from "./graphics/Utils";
import {DisplayMessageEvent, MessageType} from "./graphics/layers/EventsDisplay";
import {placeName} from "./graphics/NameBoxCalculator";



export function createClientGame(playerName: () => string, clientID: ClientID, playerID: PlayerID, ip: string | null, gameID: GameID, config: Config, terrainMap: TerrainMap): ClientGame {
    let eventBus = new EventBus()

    let game = createGame(terrainMap, eventBus, config)
    const canvas = createCanvas()
    let gameRenderer = createRenderer(canvas, game, eventBus, clientID)

    const wsHost = process.env.WEBSOCKET_URL || window.location.host;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${wsHost}`)

    const transport = new Transport(socket, eventBus, gameID, clientID, playerID, playerName)


    return new ClientGame(
        clientID,
        playerID,
        ip,
        gameID,
        eventBus,
        game,
        gameRenderer,
        new InputHandler(canvas, eventBus),
        new Executor(game, gameID),
        socket,
    )
}

export class ClientGame {
    private myPlayer: Player
    private turns: Turn[] = []
    private isActive = false

    private currTurn = 0

    private intervalID: NodeJS.Timeout

    private isProcessingTurn = false


    constructor(
        private id: ClientID,
        private playerID: PlayerID,
        private clientIP: string | null,
        private gameID: GameID,
        private eventBus: EventBus,
        private gs: Game,
        private renderer: GameRenderer,
        private input: InputHandler,
        private executor: Executor,
        private socket: WebSocket,
    ) { }

    public join() {
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
                // this.sendIntent({
                //     type: "updateName",
                //     name: this.playerName,
                //     clientID: this.id
                // })
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

        this.eventBus.on(PlayerEvent, (e) => this.playerEvent(e))
        this.eventBus.on(MouseUpEvent, (e) => this.inputEvent(e))

        this.renderer.initialize()
        this.input.initialize()
        this.gs.addExecution(...this.executor.spawnBots(this.gs.config().numBots()))
        this.gs.addExecution(...this.executor.fakeHumanExecutions(this.gs.config().numFakeHumans(this.gameID)))
        this.gs.addExecution(new WinCheckExecution(this.eventBus))

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
        this.gs.executeNextTick()
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
    }

    private inputEvent(event: MouseUpEvent) {
        if (!this.isActive) {
            return
        }
        const cell = this.renderer.transformHandler.screenToWorldCoordinates(event.x, event.y)
        if (!this.gs.isOnMap(cell)) {
            return
        }
        const tile = this.gs.tile(cell)
        if (tile.isLand() && !tile.hasOwner() && this.gs.inSpawnPhase()) {
            this.eventBus.emit(new SendSpawnIntentEvent(cell))
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
        if (tile.owner().isPlayer() && this.myPlayer.isAlliedWith(tile.owner() as Player)) {
            this.eventBus.emit(new DisplayMessageEvent("Cannot attack ally", MessageType.WARN))
            return
        }

        if (tile.isLand()) {
            for (const border of this.myPlayer.borderTiles()) {
                for (const n of border.neighbors()) {
                    if (n.owner() == tile.owner()) {
                        this.eventBus.emit(new SendAttackIntentEvent(targetID))
                        return
                    }
                }
            }
        }
    }
}