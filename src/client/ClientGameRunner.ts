import { Executor } from "../core/execution/ExecutionManager";
import { Cell, MutableGame, PlayerEvent, PlayerID, MutablePlayer, TileEvent, Player, Game, UnitEvent, Tile, PlayerType, GameMap, Difficulty, GameType } from "../core/game/Game";
import { createGame } from "../core/game/GameImpl";
import { EventBus } from "../core/EventBus";
import { createRenderer, GameRenderer } from "./graphics/GameRenderer";
import { InputHandler, MouseUpEvent, ZoomEvent, DragEvent, MouseDownEvent } from "./InputHandler"
import { ClientID, ClientIntentMessageSchema, ClientJoinMessageSchema, ClientMessageSchema, GameConfig, GameID, Intent, ServerMessage, ServerMessageSchema, ServerSyncMessage, Turn } from "../core/Schemas";
import { loadTerrainFromFile, loadTerrainMap, TerrainMapImpl } from "../core/game/TerrainMapLoader";
import { and, bfs, dist, generateID, manhattanDist } from "../core/Util";
import { WinCheckExecution } from "../core/execution/WinCheckExecution";
import { SendAttackIntentEvent, SendSpawnIntentEvent, Transport } from "./Transport";
import { createCanvas } from "./Utils";
import { DisplayMessageEvent, MessageType } from "./graphics/layers/EventsDisplay";
import { WorkerClient } from "../core/worker/WorkerClient";
import { consolex, initRemoteSender } from "../core/Consolex";
import { getConfig, getServerConfig } from "../core/configuration/Config";

export interface LobbyConfig {
    playerName: () => string
    clientID: ClientID,
    playerID: PlayerID,
    persistentID: string,
    gameType: GameType
    gameID: GameID,
    map: GameMap | null
    difficulty: Difficulty | null
}

export function joinLobby(lobbyConfig: LobbyConfig, onjoin: () => void): () => void {
    const eventBus = new EventBus()
    initRemoteSender(eventBus)

    consolex.log(`joinging lobby: gameID: ${lobbyConfig.gameID}, clientID: ${lobbyConfig.clientID}, persistentID: ${lobbyConfig.persistentID}`)

    const serverConfig = getServerConfig()

    let gameConfig: GameConfig = null
    if (lobbyConfig.gameType == GameType.Singleplayer) {
        gameConfig = {
            gameType: GameType.Singleplayer,
            gameMap: lobbyConfig.map,
            difficulty: lobbyConfig.difficulty,
        }
    }

    const transport = new Transport(
        lobbyConfig,
        gameConfig,
        eventBus,
        serverConfig,
    )

    const onconnect = () => {
        consolex.log(`Joined game lobby ${lobbyConfig.gameID}`);
        transport.joinGame(0)
    };
    const onmessage = (message: ServerMessage) => {
        if (message.type == "start") {
            consolex.log('lobby: game started')
            onjoin()
            createClientGame(lobbyConfig, message.config, eventBus, transport).then(r => r.start())
        };
    }
    transport.connect(onconnect, onmessage)
    return () => {
        consolex.log('leaving game')
        transport.leaveGame()
    }
}


export async function createClientGame(lobbyConfig: LobbyConfig, gameConfig: GameConfig, eventBus: EventBus, transport: Transport): Promise<ClientGameRunner> {
    const config = getConfig(gameConfig)

    const terrainMap = await loadTerrainMap(gameConfig.gameMap);

    let game = createGame(terrainMap.map, terrainMap.miniMap, eventBus, config)

    consolex.log('going to init path finder')
    consolex.log('inited path finder')
    const canvas = createCanvas()
    let gameRenderer = createRenderer(canvas, game, eventBus, lobbyConfig.clientID)


    consolex.log(`creating private game got difficulty: ${gameConfig.difficulty}`)

    return new ClientGameRunner(
        lobbyConfig.clientID,
        eventBus,
        game,
        gameRenderer,
        new InputHandler(canvas, eventBus),
        new Executor(game, lobbyConfig.gameID),
        transport,
    )
}

export class ClientGameRunner {
    private myPlayer: Player
    private turns: Turn[] = []
    private isActive = false

    private currTurn = 0

    private intervalID: NodeJS.Timeout

    private isProcessingTurn = false
    private hasJoined = false

    constructor(
        private clientID: ClientID,
        private eventBus: EventBus,
        private gs: Game,
        private renderer: GameRenderer,
        private input: InputHandler,
        private executor: Executor,
        private transport: Transport,
    ) { }

    public start() {
        consolex.log('starting client game')
        this.isActive = true
        this.eventBus.on(PlayerEvent, (e) => this.playerEvent(e))
        this.eventBus.on(MouseUpEvent, (e) => this.inputEvent(e))

        this.renderer.initialize()
        this.input.initialize()
        this.gs.addExecution(...this.executor.spawnBots(this.gs.config().numBots()))
        if (this.gs.config().spawnNPCs()) {
            this.gs.addExecution(...this.executor.fakeHumanExecutions())
        }
        this.gs.addExecution(new WinCheckExecution(this.eventBus))

        this.intervalID = setInterval(() => this.tick(), 10);

        const onconnect = () => {
            consolex.log('Connected to game server!');
            this.transport.joinGame(this.turns.length)
        };
        const onmessage = (message: ServerMessage) => {
            if (message.type == "start") {
                this.hasJoined = true
                consolex.log("starting game!")
                for (const turn of message.turns) {
                    if (turn.turnNumber < this.turns.length) {
                        continue
                    }
                    this.turns.push(turn)
                }
            }
            if (message.type == "turn") {
                if (!this.hasJoined) {
                    this.transport.joinGame(0)
                    return
                }
                if (this.turns.length != message.turn.turnNumber) {
                    consolex.error(`got wrong turn have turns ${this.turns.length}, received turn ${message.turn.turnNumber}`)
                } else {
                    this.turns.push(message.turn)
                }
            }
        };
        this.transport.connect(onconnect, onmessage)

    }

    public stop() {
        clearInterval(this.intervalID)
        this.isActive = false
        this.transport.leaveGame()
    }

    public tick() {
        if (this.currTurn >= this.turns.length || this.isProcessingTurn) {
            return
        }
        this.isProcessingTurn = true
        this.gs.addExecution(...this.executor.createExecs(this.turns[this.currTurn]))
        try {
            const start = performance.now()
            this.gs.executeNextTick()
            const duration = performance.now() - start
            if (duration > 200) {
                console.warn(`tick ${this.gs.ticks() - 1} took ${duration}ms to execute`)
            }
        } catch (error) {
            showErrorModal(error, this.clientID)
            this.stop()
            const errorText = `Error: ${error.message}\nStack: ${error.stack}`;
            consolex.error(errorText)
        }
        this.renderer.tick()
        this.currTurn++
        this.isProcessingTurn = false
    }

    private playerEvent(event: PlayerEvent) {
        if (event.player.clientID() == this.clientID) {
            consolex.log('setting name')
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
        consolex.log(`clicked cell ${cell}`)
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
            if (tile.hasOwner()) {
                if (this.myPlayer.sharesBorderWith(tile.owner())) {
                    this.eventBus.emit(new SendAttackIntentEvent(targetID, this.myPlayer.troops() * this.renderer.uiState.attackRatio))
                }
            } else {
                outer_loop: for (const t of bfs(tile, and(t => !t.hasOwner() && t.isLand(), dist(tile, 200)))) {
                    for (const n of t.neighbors()) {
                        if (n.owner() == this.myPlayer) {
                            this.eventBus.emit(new SendAttackIntentEvent(targetID, this.myPlayer.troops() * this.renderer.uiState.attackRatio))
                            break outer_loop
                        }
                    }
                }
            }
        }
    }
}

function showErrorModal(error: Error, clientID: ClientID) {
    const errorText = `Error: ${error.message}\nStack: ${error.stack}`;
    consolex.error(errorText);

    const modal = document.createElement('div');
    const content = `Game crashed! client id: ${clientID}\nPlease paste the following in your bug report in Discord:\n${errorText}`;

    // Create elements
    const pre = document.createElement('pre');
    pre.textContent = content;

    const button = document.createElement('button');
    button.textContent = 'Copy to clipboard';
    button.style.cssText = 'padding: 8px 16px; margin-top: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';
    button.addEventListener('click', () => {
        navigator.clipboard.writeText(content)
            .then(() => button.textContent = 'Copied!')
            .catch(() => button.textContent = 'Failed to copy');
    });

    // Add to modal
    modal.style.cssText = 'position:fixed; padding:20px; background:white; border:1px solid black; top:50%; left:50%; transform:translate(-50%,-50%); z-index:9999;';
    modal.appendChild(pre);
    modal.appendChild(button);

    document.body.appendChild(modal);
}