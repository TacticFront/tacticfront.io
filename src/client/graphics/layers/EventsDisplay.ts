import {nullable} from "zod";
import {EventBus, GameEvent} from "../../../core/EventBus";
import {AllianceRequest, AllianceRequestEvent, AllianceRequestReplyEvent, Game} from "../../../core/game/Game";
import {ClientID} from "../../../core/Schemas";
import {Layer} from "./Layer";

export class AllianceRequestReplyUIEvent implements GameEvent {
    constructor(
        public readonly allianceRequest: AllianceRequest,
        public readonly accepted: boolean,
    ) { }
}

interface Event {
    description: string;
    buttons?: {
        text: string
        className: string
        action: () => void
    }[];
    highlight?: boolean;
    createdAt: number
}

export class EventsDisplay implements Layer {
    private container: HTMLElement;
    private events: Event[];
    private tableContainer: HTMLDivElement;


    constructor(private eventBus: EventBus, private game: Game, private clientID: ClientID) {
        const element = document.getElementById("app");
        element.style.zIndex = "1000"
        if (!element) throw new Error(`Container element with id app not found`);
        this.container = element;
        this.events = [];
        this.createTableContainer()
    }

    init() {
        this.eventBus.on(AllianceRequestEvent, a => this.onAllianceRequestEvent(a))
        this.eventBus.on(AllianceRequestReplyEvent, a => this.onAllianceRequestReplyEvent(a))
        this.renderTable()
    }

    tick() {
        const remainingEvent: Event[] = []
        for (const event of this.events) {
            if (this.game.ticks() - event.createdAt < 100) {
                remainingEvent.push(event)
            }
        }
        this.events = remainingEvent
        this.renderTable()
    }

    private createTableContainer() {
        this.tableContainer = document.createElement('div');
        this.tableContainer.id = 'table-container';
        this.tableContainer.style.position = 'fixed';
        this.tableContainer.style.bottom = '0px'; // Distance from bottom
        this.tableContainer.style.right = '0px'; // Distance from right
        this.tableContainer.style.zIndex = '1000';
        this.tableContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.0)';
        this.tableContainer.style.padding = '20px';
        this.tableContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.0)';
        document.body.appendChild(this.tableContainer);
        this.tableContainer.style.minWidth = '400px'; // Set minimum width
    }

    shouldTransform(): boolean {
        return false
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
                    action: () => this.eventBus.emit(new AllianceRequestReplyUIEvent(event.allianceRequest, true)),
                },
                {
                    text: "Reject",
                    className: "btn btn-info",
                    action: () => this.eventBus.emit(new AllianceRequestReplyUIEvent(event.allianceRequest, false)),
                }
            ],
            highlight: true,
            createdAt: this.game.ticks()
        });
        this.renderTable()
    }

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
            highlight: true,
            createdAt: this.game.ticks(),
        });
        this.renderTable()
    }

    addEvent(event: Event): void {
        this.events.push(event);
    }

    removeEvent(index: number): void {
        this.events.splice(index, 1);
    }

    updateEvent(index: number, event: Event): void {
        this.events[index] = event;
    }

    render(): void { }

    renderTable(): void {
        let tableHtml = `
            <table class="events-table">
                <tbody>
        `;

        this.events.forEach((event, eventIndex) => {
            tableHtml += `
                <tr${event.highlight ? ' style="background-color: rgba(255, 255, 0, 0.1);"' : ''}>
                    <td>
                        ${event.description}
                        ${event.buttons ? '<br>' + event.buttons.map((btn, btnIndex) =>
                `<button class="${btn.className}" data-event-index="${eventIndex}" data-button-index="${btnIndex}">${btn.text}</button>`
            ).join('') : ''}
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
                e.stopPropagation(); // Prevent the event from reaching the canvas
                const target = e.target as HTMLElement;
                const eventIndex = parseInt(target.getAttribute('data-event-index') || '');
                const buttonIndex = parseInt(target.getAttribute('data-button-index') || '');

                if (!isNaN(eventIndex) && !isNaN(buttonIndex)) {
                    const event = this.events[eventIndex];
                    const buttonAction = event.buttons?.[buttonIndex]?.action;
                    if (buttonAction) {
                        buttonAction();
                        // Optionally, you might want to remove the event after the action is performed
                        this.removeEvent(eventIndex);
                        this.renderTable(); // Re-render the table if you remove the event
                    }
                }
            });
        });
    }
}