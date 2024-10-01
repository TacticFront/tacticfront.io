import {nullable} from "zod";
import {EventBus, GameEvent} from "../../../core/EventBus";
import {AllianceExpiredEvent, AllianceRequestEvent, AllianceRequestReplyEvent, BrokeAllianceEvent, Game, Player, PlayerID} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {Layer} from "./Layer";
import {SendAllianceReplyIntentEvent} from "../../Transport";

export enum MessageType {
    SUCCESS,
    INFO,
    WARN,
    ERROR,
}

export class DisplayMessageEvent implements GameEvent {
    constructor(
        public readonly message: string,
        public readonly type: MessageType,
        public readonly playerID: PlayerID | null = null
    ) { }
}

interface Event {
    description: string;
    buttons?: {
        text: string
        className: string
        action: () => void
    }[];
    type: MessageType;
    highlight?: boolean;
    createdAt: number
    onDelete?: () => void
}

export class EventsDisplay implements Layer {
    private events: Event[];
    private tableContainer: HTMLDivElement;


    constructor(private eventBus: EventBus, private game: Game, private clientID: ClientID) {
        const element = document.getElementById("app");
        element.style.zIndex = "1000"
        if (!element) throw new Error(`Container element with id app not found`);
        this.events = [];
        this.createTableContainer()
    }

    init() {
        this.eventBus.on(AllianceRequestEvent, a => this.onAllianceRequestEvent(a))
        this.eventBus.on(AllianceRequestReplyEvent, a => this.onAllianceRequestReplyEvent(a))
        this.eventBus.on(DisplayMessageEvent, e => this.onDisplayMessageEvent(e))
        this.eventBus.on(BrokeAllianceEvent, e => this.onBrokeAllianceEvent(e))
        this.eventBus.on(AllianceExpiredEvent, e => this.onAllianceExpiredEvent(e))
        this.renderTable()
    }

    tick() {
        let remainingEvents: Event[] = []
        for (const event of this.events) {
            if (this.game.ticks() - event.createdAt < 50) {
                remainingEvents.push(event)
            } else if (event.onDelete != null) {
                event.onDelete()
            }
        }
        if (remainingEvents.length > 5) {
            remainingEvents = remainingEvents.slice(-5)
        }

        let shouldRender = false
        if (this.events.length != remainingEvents.length) {
            shouldRender = true
        }
        this.events = remainingEvents
        if (shouldRender) {
            this.renderTable()
        }
    }

    private createTableContainer() {
        this.tableContainer = document.createElement('div');
        this.tableContainer.id = 'table-container';
        this.tableContainer.className = 'events-display';
        this.tableContainer.style.display = "none";
        document.body.appendChild(this.tableContainer);
    }

    shouldTransform(): boolean {
        return false
    }

    onDisplayMessageEvent(event: DisplayMessageEvent) {
        if (event.playerID != null) {
            const myPlayer = this.game.playerByClientID(this.clientID)
            if (myPlayer == null) {
                return
            }
            if (myPlayer == null) {
                return
            }
            if (myPlayer.id() != event.playerID) {
                return
            }
        }
        this.addEvent({
            description: event.message,
            createdAt: this.game.ticks(),
            highlight: true,
            type: event.type,
        })
        this.renderTable()
    }

    onAllianceRequestEvent(event: AllianceRequestEvent): void {
        const myPlayer = this.game.playerByClientID(this.clientID)
        if (myPlayer == null) {
            return
        }

        if (event.allianceRequest.recipient() != myPlayer) {
            return
        }

        this.addEvent({
            description: `${event.allianceRequest.requestor().name()} requests an alliance!`,
            buttons: [
                {
                    text: "Accept",
                    className: "btn",
                    action: () => this.eventBus.emit(new SendAllianceReplyIntentEvent(event.allianceRequest, true)),
                },
                {
                    text: "Reject",
                    className: "btn btn-info",
                    action: () => this.eventBus.emit(new SendAllianceReplyIntentEvent(event.allianceRequest, false)),
                }
            ],
            highlight: true,
            type: MessageType.INFO,
            createdAt: this.game.ticks(),
            onDelete: () => this.eventBus.emit(new SendAllianceReplyIntentEvent(event.allianceRequest, false))
        });
    }

    // TODO: move this to DisplayMessageEvent
    onAllianceRequestReplyEvent(event: AllianceRequestReplyEvent) {
        const myPlayer = this.game.playerByClientID(this.clientID)
        if (myPlayer == null) {
            return
        }

        if (event.allianceRequest.requestor() != myPlayer) {
            return
        }
        this.addEvent({
            description: `${event.allianceRequest.recipient().name()} ${event.accepted ? "accepted" : "rejected"} your alliance request`,
            type: event.accepted ? MessageType.SUCCESS : MessageType.ERROR,
            highlight: true,
            createdAt: this.game.ticks(),
        });
    }

    onBrokeAllianceEvent(event: BrokeAllianceEvent) {
        const myPlayer = this.game.playerByClientID(this.clientID)
        if (myPlayer == null) {
            return
        }
        if (event.traitor == myPlayer) {
            this.addEvent({
                description: `You broke your alliance with ${event.betrayed.name()}, making you a TRAITOR`,
                type: MessageType.ERROR,
                highlight: true,
                createdAt: this.game.ticks(),
            })
        }
        if (event.betrayed == myPlayer) {
            this.addEvent({
                description: `${event.traitor.name()}, broke their alliance with you`,
                type: MessageType.ERROR,
                highlight: true,
                createdAt: this.game.ticks(),
            })
        }
    }

    onAllianceExpiredEvent(event: AllianceExpiredEvent) {
        const myPlayer = this.game.playerByClientID(this.clientID)
        if (myPlayer == null) {
            return
        }
        let other: Player = null
        if (event.player1 == myPlayer) {
            other = event.player2
        }
        if (event.player2 == myPlayer) {
            other = event.player1
        }
        if (other == null) {
            return
        }
        if (!myPlayer.isAlive() || !other.isAlive()) {
            return
        }
        this.addEvent({
            description: `Your alliance with ${other.name()} expired`,
            type: MessageType.WARN,
            highlight: true,
            createdAt: this.game.ticks(),
        })
    }

    addEvent(event: Event): void {
        this.events.push(event);
        this.renderTable()
    }

    removeEvent(index: number): void {
        this.events.splice(index, 1);
    }

    updateEvent(index: number, event: Event): void {
        this.events[index] = event;
    }

    render(): void { }

    renderTable(): void {
        if (this.events.length === 0) {
            this.tableContainer.innerHTML = "";
            this.tableContainer.style.display = "none";
            return;
        }

        this.tableContainer.style.display = "block";


        let tableHtml = `
        <table class="events-table">
            <tbody>
    `;

        this.events.forEach((event, eventIndex) => {
            const typeClass = MessageType[event.type].toLowerCase();
            tableHtml += `
            <tr class="${event.highlight ? 'highlight' : ''} ${typeClass}">
                <td>
                    ${event.description}
                    ${event.buttons ? '<div class="button-container">' + event.buttons.map((btn, btnIndex) =>
                `<button class="${btn.className}" data-event-index="${eventIndex}" data-button-index="${btnIndex}">${btn.text}</button>`
            ).join('') + '</div>' : ''}
                </td>
            </tr>
        `;
        });

        tableHtml += `
            </tbody>
        </table>
    `;
        this.tableContainer.innerHTML = tableHtml;


        // Add event listeners to buttons
        this.tableContainer.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const target = e.target as HTMLElement;
                const eventIndex = parseInt(target.getAttribute('data-event-index') || '');
                const buttonIndex = parseInt(target.getAttribute('data-button-index') || '');

                if (!isNaN(eventIndex) && !isNaN(buttonIndex)) {
                    const event = this.events[eventIndex];
                    const buttonAction = event.buttons?.[buttonIndex]?.action;
                    if (buttonAction) {
                        buttonAction();
                        this.removeEvent(eventIndex);
                        this.renderTable();
                    }
                }
            });
        });
    }
}