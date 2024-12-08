import { ClientMessage, ClientMessageSchema, GameConfig, GameRecordSchema, Intent, ServerPingMessageSchema, ServerStartGameMessage, ServerStartGameMessageSchema, ServerTurnMessageSchema, Turn } from "../core/Schemas";
import { Config } from "../core/configuration/Config";
import { Client } from "./Client";
import WebSocket from 'ws';
import { slog } from "./StructuredLog";
import { Storage } from '@google-cloud/storage';
import { CreateGameRecord, CreateGameRecord as ProcessRecord } from "../core/Util";
import { archive } from "./Archive";
import { arc } from "d3";


export enum GamePhase {
    Lobby = 'LOBBY',
    Active = 'ACTIVE',
    Finished = 'FINISHED'
}

export class GameServer {


    private maxGameDuration = 2 * 60 * 60 * 1000 // 2 hours

    private turns: Turn[] = []
    private intents: Intent[] = []
    private clients: Client[] = []
    private _hasStarted = false
    private _startTime: number = null

    private endTurnIntervalID

    constructor(
        public readonly id: string,
        public readonly createdAt: number,
        public readonly isPublic: boolean,
        private config: Config,
        private gameConfig: GameConfig,

    ) {}

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
        client.lastPing = Date.now()
        client.ws.on('message', (message: string) => {
            const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
            if (clientMsg.type == "intent") {
                if (clientMsg.gameID == this.id) {
                    this.addIntent(clientMsg.intent)
                } else {
                    console.warn(`client ${clientMsg.clientID} sent to wrong game`)
                }
            }
            if (clientMsg.type == "ping") {
                client.lastPing = Date.now()
            }
        })
        client.ws.on('close', () => {
            console.log(`client ${client.id} disconnected`)
            this.clients = this.clients.filter(c => c.id != client.id)
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
        if (this._startTime > 0) {
            return this._startTime
        } else {
            //game hasn't started yet, only works for public games
            return this.createdAt + this.config.lobbyLifetime()
        }
    }

    public start() {
        this._hasStarted = true
        this._startTime = Date.now()

        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.config.turnIntervalMs());
        this.clients.forEach(c => {
            console.log(`game ${this.id} sending start message to ${c.id}`)
            this.sendStartGameMsg(c.ws, 0)
        })
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

    async endGame() {
        // Close all WebSocket connections
        clearInterval(this.endTurnIntervalID);
        this.clients.forEach(client => {
            client.ws.removeAllListeners('message'); // TODO: remove this?
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close(1000, "game has ended");
            }
        });
        console.log(`ending game ${this.id} with ${this.turns.length} turns`)
        try {
            if (this.turns.length > 100) {
                const record = CreateGameRecord(this.id, this.gameConfig, this.turns, this._startTime, Date.now())
                archive(record)
            }
        } catch (error) {
            console.log('error writing game to gcs: ' + error)
        }
    }

    phase(): GamePhase {
        const now = Date.now()
        const alive = []
        for (const client of this.clients) {
            if (now - client.lastPing > 60_000) {
                console.log(`no pings from ${client.id}, terminating connection`)
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.close(1000, "no heartbeats received, closing connection");
                }
            } else {
                alive.push(client)
            }
        }
        this.clients = alive
        if (now > this.createdAt + this.config.lobbyLifetime() + this.maxGameDuration) {
            console.warn(`game past max duration ${this.id}`)
            return GamePhase.Finished
        }
        if (!this.isPublic) {
            if (this._hasStarted) {
                if (this.clients.length == 0) {
                    console.log(`private game: ${this.id} complete`)
                    return GamePhase.Finished
                } else {
                    return GamePhase.Active
                }
            } else {
                return GamePhase.Lobby
            }
        }

        if (now - this.createdAt < this.config.lobbyLifetime()) {
            return GamePhase.Lobby
        }

        if (this.clients.length == 0 && now > this.createdAt + this.config.lobbyLifetime() + 30 * 60) { // wait at least 30s before ending game
            return GamePhase.Finished
        }

        return GamePhase.Active
    }

    hasStarted(): boolean {
        return this._hasStarted
    }

}