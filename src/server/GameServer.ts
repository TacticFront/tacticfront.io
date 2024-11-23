import { ClientMessage, ClientMessageSchema, GameConfig, Intent, ServerStartGameMessage, ServerStartGameMessageSchema, ServerTurnMessageSchema, Turn } from "../core/Schemas";
import { Config } from "../core/configuration/Config";
import { Client } from "./Client";
import WebSocket from 'ws';
import { slog } from "./StructuredLog";


export enum GamePhase {
    Lobby = 'LOBBY',
    Active = 'ACTIVE',
    Finished = 'FINISHED'
}

export class GameServer {


    private maxGameDuration = 60 * 60 * 1000 // 1 hour

    private turns: Turn[] = []
    private intents: Intent[] = []
    private clients: Client[] = []
    private _hasStarted = false

    private endTurnIntervalID


    constructor(
        public readonly id: string,
        public readonly createdAt: number,
        public readonly isPublic: boolean,
        private config: Config,
        private gameConfig: GameConfig,

    ) { }

    public updateGameConfig(gameConfig: GameConfig): void {
        if (gameConfig.gameMap != null) {
            this.gameConfig.gameMap = gameConfig.gameMap
        }
        if (gameConfig.difficulty != null) {
            this.gameConfig.difficulty = gameConfig.difficulty
        }
    }

    public addClient(client: Client, lastTurn: number) {
        console.log(`game ${this.id} adding client ${client.id}`)
        slog('client_joined_game', `client ${client.id} (re)joining game ${this.id}`, {
            clientID: client.id,
            clientIP: client.ip,
            gameID: this.id,
            isRejoin: lastTurn > 0
        })
        // Remove stale client if this is a reconnect
        const existing = this.clients.find(c => c.id == client.id)
        if (existing != null) {
            existing.ws.removeAllListeners('message')
        }
        this.clients = this.clients.filter(c => c.id != client.id)
        this.clients.push(client)
        client.ws.on('message', (message: string) => {
            const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
            if (clientMsg.type == "intent") {
                if (clientMsg.gameID == this.id) {
                    this.addIntent(clientMsg.intent)
                } else {
                    console.warn(`client ${clientMsg.clientID} sent to wrong game`)
                }
            }
            if (clientMsg.type == "leave") {
                // TODO: get rid of leave message, just use on close?
                const toRemove = this.clients.filter(c => c.id)
                if (toRemove.length == 0) {
                    return
                }
                toRemove[0].ws.close()
                console.log(`client ${toRemove[0].id} left game`)
                this.clients = this.clients.filter(c => c.id != clientMsg.clientID)
            }
        })

        // In case a client joined the game late and missed the start message.
        if (this._hasStarted) {
            this.sendStartGameMsg(client.ws, lastTurn)
        }
    }

    public numClients(): number {
        return this.clients.length
    }

    public startTime(): number {
        return this.createdAt + this.config.lobbyLifetime()
    }

    public start() {
        this._hasStarted = true
        this.clients.forEach(c => {
            console.log(`game ${this.id} sending start message to ${c.id}`)
            this.sendStartGameMsg(c.ws, 0)
        })
        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.config.turnIntervalMs());
    }

    private addIntent(intent: Intent) {
        this.intents.push(intent)
    }

    private sendStartGameMsg(ws: WebSocket, lastTurn: number) {
        ws.send(JSON.stringify(ServerStartGameMessageSchema.parse(
            {
                type: "start",
                turns: this.turns.slice(lastTurn),
                config: this.gameConfig
            }
        )))
    }

    private endTurn() {
        const pastTurn: Turn = {
            turnNumber: this.turns.length,
            gameID: this.id,
            intents: this.intents
        }
        this.turns.push(pastTurn)
        this.intents = []

        const msg = JSON.stringify(ServerTurnMessageSchema.parse(
            {
                type: "turn",
                turn: pastTurn
            }
        ))
        this.clients.forEach(c => {
            c.ws.send(msg)
        })
    }

    endGame() {
        // Close all WebSocket connections
        clearInterval(this.endTurnIntervalID);
        this.clients.forEach(client => {
            client.ws.removeAllListeners('message');
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close();
            }
        });
    }

    phase(): GamePhase {
        if (Date.now() > this.createdAt + this.config.lobbyLifetime() + this.maxGameDuration) {
            console.warn(`game past max duration ${this.id}`)
            return GamePhase.Finished
        }
        if (!this.isPublic) {
            if (this._hasStarted) {
                if (this.clients.length == 0) {
                    console.log()
                    return GamePhase.Finished
                } else {
                    return GamePhase.Active
                }
            } else {
                return GamePhase.Lobby
            }
        }

        if (Date.now() - this.createdAt < this.config.lobbyLifetime()) {
            return GamePhase.Lobby
        }

        if (this.clients.length == 0 && Date.now() > this.createdAt + this.config.lobbyLifetime() + 30 * 60) { // wait at least 30s before ending game
            return GamePhase.Finished
        }

        return GamePhase.Active
    }

    hasStarted(): boolean {
        return this._hasStarted
    }

}