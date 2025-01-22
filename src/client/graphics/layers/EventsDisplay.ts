import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EventBus } from "../../../core/EventBus";
import {
  AllianceExpiredUpdate,
  AllianceRequestReplyUpdate,
  AllianceRequestUpdate,
  AllPlayers,
  BrokeAllianceUpdate,
  DisplayMessageUpdate,
  EmojiUpdate,
  GameUpdateType,
  MessageType,
  TargetPlayerUpdate,
} from "../../../core/game/Game";
import { ClientID } from "../../../core/Schemas";
import { Layer } from "./Layer";
import { SendAllianceReplyIntentEvent } from "../../Transport";
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { onlyImages, sanitize } from '../../../core/Util';
import { GameView, PlayerView } from '../../../core/GameView';

interface Event {
  description: string;
  unsafeDescription?: boolean
  buttons?: {
    text: string;
    className: string;
    action: () => void;
  }[];
  type: MessageType;
  highlight?: boolean;
  createdAt: number;
  onDelete?: () => void;
}

@customElement('events-display')
export class EventsDisplay extends LitElement implements Layer {
  public eventBus: EventBus;
  public game: GameView;
  public clientID: ClientID;

  private events: Event[] = [];

  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 1000;
      max-width: 800px;
    }

    .events-table {
      width: 100%;
      border-collapse: collapse;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      font-size: 0.9em;
    }

    .events-table th,
    .events-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.0);
      z-index: 1000;
    }

    .events-table th {
      background-color: rgba(0, 0, 0, 0.0);
      font-size: 1em;
      text-transform: uppercase;
    }

    .events-table tr:hover {
      background-color: rgba(255, 255, 255, 0.0);
    }

    .btn {
      display: inline-block;
      padding: 4px 12px;
      margin: 3px 8px 3px 0;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.3s;
      border: none;
      cursor: pointer;
      font-size: 0.9em;
    }

    .btn:hover {
      background-color: #45a049;
    }

    .btn-info {
      background-color: #2196F3;
    }

    .btn-info:hover {
      background-color: #0b7dda;
    }

    .success td { color: rgb(120, 255, 140); }
    .info td { color: rgb(230, 230, 230); }
    .warn td { color: rgb(255, 220, 80) }
    .error td { color: rgb(255, 100, 100); }

    .button-container {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    @media (max-width: 600px) {
      :host {
        bottom: auto;
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: calc(100% - 20px);
      }

      .events-table th,
      .events-table td {
        padding: 6px 10px;
      }
      
      .btn {
        display: block;
        margin: 3px 0;
        width: 100%;
      }

      .button-container {
        flex-direction: column;
      }
    }
  `;

  private updateMap = new Map([
    [GameUpdateType.DisplayEvent, u => this.onDisplayMessageEvent(u)],
    [GameUpdateType.AllianceRequest, u => this.onAllianceRequestEvent(u)],
    [GameUpdateType.AllianceRequestReply, u => this.onAllianceRequestReplyEvent(u)],
    [GameUpdateType.BrokeAlliance, u => this.onBrokeAllianceEvent(u)],
    [GameUpdateType.TargetPlayer, u => this.onTargetPlayerEvent(u)],
    [GameUpdateType.EmojiUpdate, u => this.onEmojiMessageEvent(u)]
  ])

  constructor() {
    super();
    this.events = [];
  }

  init() {
  }

  tick() {
    const updates = this.game.updatesSinceLastTick()
    for (const [ut, fn] of this.updateMap) {
      updates[ut]?.forEach(u => fn(u))
    }


    let remainingEvents = this.events.filter(event => {
      const shouldKeep = this.game.ticks() - event.createdAt < 80;
      if (!shouldKeep && event.onDelete) {
        event.onDelete();
      }
      return shouldKeep;
    });

    if (remainingEvents.length > 10) {
      remainingEvents = remainingEvents.slice(-10);
    }

    if (this.events.length !== remainingEvents.length) {
      this.events = remainingEvents;
      this.requestUpdate()
    }
  }

  private addEvent(event: Event) {
    this.events = [...this.events, event];
    this.requestUpdate()
  }

  private removeEvent(index: number) {
    this.events = [
      ...this.events.slice(0, index),
      ...this.events.slice(index + 1)
    ];
  }

  shouldTransform(): boolean {
    return false;
  }

  renderLayer(): void { }

  onDisplayMessageEvent(event: DisplayMessageUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (event.playerID != null && (!myPlayer || myPlayer.smallID() !== event.playerID)) {
      return;
    }

    this.addEvent({
      description: event.message,
      createdAt: this.game.ticks(),
      highlight: true,
      type: event.messageType,
      unsafeDescription: true,
    });
  }

  onAllianceRequestEvent(update: AllianceRequestUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (!myPlayer || update.recipientID !== myPlayer.smallID()) {
      return;
    }

    const requestor = this.game.playerBySmallID(update.requestorID) as PlayerView
    const recipient = this.game.playerBySmallID(update.recipientID) as PlayerView

    this.addEvent({
      description: `${requestor.name()} requests an alliance!`,
      buttons: [
        {
          text: "Accept",
          className: "btn",
          action: () => this.eventBus.emit(
            new SendAllianceReplyIntentEvent(requestor, recipient, true)
          ),
        },
        {
          text: "Reject",
          className: "btn btn-info",
          action: () => this.eventBus.emit(
            new SendAllianceReplyIntentEvent(requestor, recipient, false)
          ),
        }
      ],
      highlight: true,
      type: MessageType.INFO,
      createdAt: this.game.ticks(),
      onDelete: () => this.eventBus.emit(
        new SendAllianceReplyIntentEvent(requestor, recipient, false)
      )
    });
  }

  onAllianceRequestReplyEvent(update: AllianceRequestReplyUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (!myPlayer || update.request.requestorID !== myPlayer.smallID()) {
      return;
    }

    const recipient = this.game.playerBySmallID(update.request.recipientID) as PlayerView

    this.addEvent({
      description: `${recipient.name()} ${update.accepted ? "accepted" : "rejected"} your alliance request`,
      type: update.accepted ? MessageType.SUCCESS : MessageType.ERROR,
      highlight: true,
      createdAt: this.game.ticks(),
    });
  }

  onBrokeAllianceEvent(update: BrokeAllianceUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (!myPlayer) return;

    const betrayed = this.game.playerBySmallID(update.betrayedID) as PlayerView
    const traitor = this.game.playerBySmallID(update.traitorID) as PlayerView

    if (!betrayed.isTraitor() && traitor === myPlayer) {
      this.addEvent({
        description: `You broke your alliance with ${betrayed.name()}, making you a TRAITOR`,
        type: MessageType.ERROR,
        highlight: true,
        createdAt: this.game.ticks(),
      });
    } else if (betrayed === myPlayer) {
      this.addEvent({
        description: `${traitor.name()}, broke their alliance with you`,
        type: MessageType.ERROR,
        highlight: true,
        createdAt: this.game.ticks(),
      });
    }
  }

  onAllianceExpiredEvent(update: AllianceExpiredUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (!myPlayer) return;

    const otherID = update.player1ID === myPlayer.smallID() ? update.player2ID : update.player2ID === myPlayer.smallID() ? update.player1ID : null;
    const other = this.game.playerBySmallID(otherID) as PlayerView
    if (!other || !myPlayer.isAlive() || !other.isAlive()) return;

    this.addEvent({
      description: `Your alliance with ${other.name()} expired`,
      type: MessageType.WARN,
      highlight: true,
      createdAt: this.game.ticks(),
    });
  }

  onTargetPlayerEvent(event: TargetPlayerUpdate) {
    const other = this.game.playerBySmallID(event.playerID) as PlayerView
    const myPlayer = this.game.playerByClientID(this.clientID) as PlayerView
    if (!myPlayer || !myPlayer.isAlliedWith(other)) return;

    const target = this.game.playerBySmallID(event.targetID) as PlayerView

    this.addEvent({
      description: `${other.name()} requests you attack ${target.name()}`,
      type: MessageType.INFO,
      highlight: true,
      createdAt: this.game.ticks(),
    });
  }

  onEmojiMessageEvent(update: EmojiUpdate) {
    const myPlayer = this.game.playerByClientID(this.clientID);
    if (!myPlayer) return;

    const recipient = update.recipientID == AllPlayers ? AllPlayers : this.game.playerBySmallID(update.recipientID)
    const sender = this.game.playerBySmallID(update.senderID) as PlayerView

    if (recipient == myPlayer) {
      this.addEvent({
        description: `${sender.displayName()}:${update.message}`,
        unsafeDescription: true,
        type: MessageType.INFO,
        highlight: true,
        createdAt: this.game.ticks(),
      });
    } else if (sender === myPlayer && recipient !== AllPlayers) {
      this.addEvent({
        description: `Sent ${(recipient as PlayerView).displayName()}: ${update.message}`,
        unsafeDescription: true,
        type: MessageType.INFO,
        highlight: true,
        createdAt: this.game.ticks(),
      });
    }
  }

  render() {
    if (this.events.length === 0) {
      return html``;
    }

    return html`
      <table class="events-table">
        <tbody>
          ${this.events.map((event, index) => html`
            <tr class="${event.highlight ? 'highlight' : ''} ${MessageType[event.type].toLowerCase()}">
              <td>
                ${event.unsafeDescription ? unsafeHTML(onlyImages(event.description)) : event.description}
                ${event.buttons ? html`
                  <div class="button-container">
                    ${event.buttons.map(btn => html`
                      <button 
                        class="${btn.className}"
                        @click=${() => {
        btn.action();
        this.removeEvent(index);
        this.requestUpdate()
      }}
                      >
                        ${btn.text}
                      </button>
                    `)}
                  </div>
                ` : ''}
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}