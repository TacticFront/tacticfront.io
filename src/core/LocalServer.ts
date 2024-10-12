import {Config} from "./configuration/Config";
import {LocalSocket} from "./GameSocket";
import {ClientMessage, ClientMessageSchema} from "./Schemas";

export class LocalServer {

    public localSocket: LocalSocket

    constructor(private config: Config) {
    }

    onConnect() {

    }

    onMessage(message: string) {
        const clientMsg: ClientMessage = ClientMessageSchema.parse(JSON.parse(message))
        if (clientMsg.type == "intent") {
        }
    }
}