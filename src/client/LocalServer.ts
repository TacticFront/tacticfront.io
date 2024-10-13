import {Config} from "../core/configuration/Config";
import {ClientMessage, ClientMessageSchema, Intent, ServerMessage, ServerTurnMessageSchema, Turn} from "../core/Schemas";

export class LocalServer {

    private gameID = "LOCAL"


    private turns: Turn[] = []
    private intents: Intent[] = []

    private endTurnIntervalID

    constructor(private config: Config, private clientConnect: () => void, private clientMessage: (message: ServerMessage) => void) {
    }

    start() {
        this.endTurnIntervalID = setInterval(() => this.endTurn(), this.config.turnIntervalMs());
        this.clientConnect()
        this.clientMessage({
            type: "start",
            turns: [],
        })
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
        this.clientMessage({
            type: "turn",
            turn: pastTurn
        })
    }
}