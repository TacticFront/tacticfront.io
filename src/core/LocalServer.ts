import {Config} from "./configuration/Config";
import {GameMessageEvent, LocalSocket} from "./GameSocket";
import {ClientMessage, ClientMessageSchema, Intent, ServerTurnMessageSchema, Turn} from "./Schemas";

export class LocalServer {

    private gameID = "LOCAL"

    public localSocket: LocalSocket

    private turns: Turn[] = []
    private intents: Intent[] = []

    private endTurnIntervalID



    constructor(private config: Config) {
        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.config.turnIntervalMs());
    }

    onConnect() {

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
            gameID: this.gameID,
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
        this.localSocket.onmessage(new GameMessageEvent(msg))
    }
}