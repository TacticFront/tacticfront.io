import {EventBus, GameEvent} from "../core/EventBus"
import {AllianceRequest, Cell, Player, PlayerID, PlayerType} from "../core/game/Game"
import {ClientID, ClientIntentMessageSchema, GameID, Intent} from "../core/Schemas"


export class SendAllianceRequestIntentEvent implements GameEvent {
    constructor(
        public readonly requestor: Player,
        public readonly recipient: Player
    ) { }
}
export class SendBreakAllianceIntentEvent implements GameEvent {
    constructor(
        public readonly requestor: Player,
        public readonly recipient: Player
    ) { }
}

export class SendAllianceReplyIntentEvent implements GameEvent {
    constructor(
        public readonly allianceRequest: AllianceRequest,
        public readonly accepted: boolean
    ) { }
}

export class SendSpawnIntentEvent implements GameEvent {
    constructor(
        public readonly cell: Cell,
        public readonly playerName: string,
    ) { }
}

export class SendAttackIntentEvent implements GameEvent {
    constructor(public readonly targetID: PlayerID,
        public readonly cell: Cell,
        public readonly troops: number
    ) { }
}

export class SendBoatAttackIntentEvent implements GameEvent {
    constructor(
        public readonly targetID: PlayerID,
        public readonly cell: Cell,
        public readonly troops: number
    ) { }
}

export class Transport {

    constructor(
        private socket: WebSocket,
        private eventBus: EventBus,
        private gameID: GameID,
        private clientID: ClientID,
        private playerID: PlayerID,
    ) {
        this.eventBus.on(SendAllianceRequestIntentEvent, (e) => this.onSendAllianceRequest(e))
        this.eventBus.on(SendAllianceReplyIntentEvent, (e) => this.onAllianceRequestReplyUIEvent(e))
        this.eventBus.on(SendBreakAllianceIntentEvent, (e) => this.onBreakAllianceRequestUIEvent(e))
        this.eventBus.on(SendSpawnIntentEvent, (e) => this.onSendSpawnIntentEvent(e))
        this.eventBus.on(SendAttackIntentEvent, (e) => this.onSendAttackIntent(e))
        this.eventBus.on(SendBoatAttackIntentEvent, (e) => this.onSendBoatAttackIntent(e))
    }

    private onSendAllianceRequest(event: SendAllianceRequestIntentEvent) {
        this.sendIntent({
            type: "allianceRequest",
            clientID: this.clientID,
            requestor: event.requestor.id(),
            recipient: event.recipient.id(),
        })
    }

    private onAllianceRequestReplyUIEvent(event: SendAllianceReplyIntentEvent) {
        this.sendIntent({
            type: "allianceRequestReply",
            clientID: this.clientID,
            requestor: event.allianceRequest.requestor().id(),
            recipient: event.allianceRequest.recipient().id(),
            accept: event.accepted,
        })
    }

    private onBreakAllianceRequestUIEvent(event: SendBreakAllianceIntentEvent) {
        this.sendIntent({
            type: "breakAlliance",
            clientID: this.clientID,
            requestor: event.requestor.id(),
            recipient: event.recipient.id(),
        })
    }

    private onSendSpawnIntentEvent(event: SendSpawnIntentEvent) {
        this.sendIntent({
            type: "spawn",
            clientID: this.clientID,
            playerID: this.playerID,
            name: event.playerName,
            playerType: PlayerType.Human,
            x: event.cell.x,
            y: event.cell.y
        })
    }

    private onSendAttackIntent(event: SendAttackIntentEvent) {
        this.sendIntent({
            type: "attack",
            clientID: this.clientID,
            attackerID: this.playerID,
            targetID: event.targetID,
            troops: event.troops,
            sourceX: null,
            sourceY: null,
            targetX: event.cell.x,
            targetY: event.cell.y
        })
    }

    private onSendBoatAttackIntent(event: SendBoatAttackIntentEvent) {
        this.sendIntent({
            type: "boat",
            clientID: this.clientID,
            attackerID: this.playerID,
            targetID: event.targetID,
            troops: event.troops,
            x: event.cell.x,
            y: event.cell.y,
        })
    }

    private sendIntent(intent: Intent) {
        if (this.socket.readyState === WebSocket.OPEN) {
            const msg = ClientIntentMessageSchema.parse({
                type: "intent",
                clientID: this.clientID,
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
