import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, Player } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { EventBus } from '../../../core/EventBus';
import { TransformHandler } from '../TransformHandler';
import { MouseMoveEvent } from '../../InputHandler';

@customElement('player-info-overlay')
export class PlayerInfoOverlay extends LitElement implements Layer {
    private game: Game;
    public clientID: ClientID;
    public eventBus: EventBus;
    public transform: TransformHandler


    @state()
    private _playerName: string = '';

    @state()
    private _isVisible: boolean = false;

    init(game: Game) {
        this.game = game;
        this.eventBus.on(MouseMoveEvent, e => this.onMouseEvent(e))
    }

    private onMouseEvent(event: MouseMoveEvent) {
        this._isVisible = false
        const worldCoord = this.transform.screenToWorldCoordinates(event.x, event.y)
        if (!this.game.isOnMap(worldCoord)) {
            return
        }
        const owner = this.game.tile(worldCoord).owner()
        if (!owner.isPlayer()) {
            return
        }
        const myPlayer = this.game.playerByClientID(this.clientID);
        if (myPlayer == null) {
            return;
        }
        if (owner == myPlayer) {
            return
        }
        this._isVisible = true
        this._playerName = owner.name()
    }

    tick() {
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // Render any necessary canvas elements
    }

    shouldTransform(): boolean {
        return false;
    }

    setVisible(visible: boolean) {
        this._isVisible = visible;
        this.requestUpdate();
    }

    static styles = css`
        :host {
            display: block;
        }

        .player-info {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background-color: rgba(30, 30, 30, 0.7);
            padding: 8px 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
            color: white;
            font-size: 14px;
            min-width: 120px;
            text-align: left;
            font-size: 18px;
        }

        .hidden {
            opacity: 0;
            visibility: hidden;
        }

        .player-name {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .status {
            font-size: 12px;
            opacity: 0.8;
        }

        .status.alive {
            color: #4CAF50;
        }

        .status.dead {
            color: #f44336;
        }

        @media (max-width: 768px) {
            .player-info {
                top: 5px;
                right: 5px;
                padding: 6px 10px;
                font-size: 12px;
                min-width: 100px;
            }

            .status {
                font-size: 10px;
            }
        }
    `;

    render() {
        return html`
            <div class="player-info ${this._isVisible ? '' : 'hidden'}">
                <div class="player-name">${this._playerName}</div>
            </div>
        `;
    }
}