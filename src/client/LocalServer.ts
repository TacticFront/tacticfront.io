import { Config } from "../core/configuration/Config";
import { consolex } from "../core/Consolex";
import { ClientID, ClientMessage, ClientMessageSchema, GameConfig, GameID, GameRecordSchema, Intent, PlayerRecord, ServerMessage, ServerStartGameMessageSchema, ServerTurnMessageSchema, Turn } from "../core/Schemas";
import { CreateGameRecord, generateID } from "../core/Util";
import { LobbyConfig } from "./GameRunner";
import { getPersistentIDFromCookie } from "./Main";

export class LocalServer {


    private turns: Turn[] = []
    private intents: Intent[] = []
    private startedAt: number

    private endTurnIntervalID


    constructor(
        private config: Config,
        private gameConfig: GameConfig,
        private lobbyConfig: LobbyConfig,
        private clientConnect: () => void,
        private clientMessage: (message: ServerMessage) => void
    ) {
    }

    start() {
        this.startedAt = Date.now()
        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.config.turnIntervalMs());
        this.clientConnect()
        this.clientMessage(ServerStartGameMessageSchema.parse({
            type: "start",
            config: this.gameConfig,
            turns: [],
        }))
    }

    onMessage(message: string) {
        const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
        if (clientMsg.type == "intent") {
            this.intents.push(clientMsg.intent)
        }
    }

    private endTurn() {
        const pastTurn: Turn = {
            turnNumber: this.turns.length,
            gameID: this.lobbyConfig.gameID,
            intents: this.intents
        }
        this.turns.push(pastTurn)
        this.intents = []
        this.clientMessage({
            type: "turn",
            turn: pastTurn
        })
    }

    public endGame() {
        consolex.log('local server ending game')
        clearInterval(this.endTurnIntervalID)
        const players: PlayerRecord[] = [{
            ip: null,
            persistentID: getPersistentIDFromCookie(),
            username: this.lobbyConfig.playerName(),
            clientID: this.lobbyConfig.clientID
        }]
        const record = CreateGameRecord(
            this.lobbyConfig.gameID,
            this.gameConfig,
            players,
            this.turns,
            this.startedAt,
            Date.now()
        )
        // Clear turns because beacon only supports up to 64kb
        record.turns = []
        // For unload events, sendBeacon is the only reliable method
        const blob = new Blob([JSON.stringify(GameRecordSchema.parse(record))], {
            type: 'application/json'
        });
        navigator.sendBeacon('/archive_singleplayer_game', blob);
    }
}