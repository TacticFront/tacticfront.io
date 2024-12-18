import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, Player } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { EventBus } from '../../../core/EventBus';
import { TransformHandler } from '../TransformHandler';
import { MouseMoveEvent } from '../../InputHandler';
import { dist, distSortUnit, euclideanDist, manhattanDist } from '../../../core/Util';

@customElement('player-info-overlay')
export class PlayerInfoOverlay extends LitElement implements Layer {
    private game: Game;
    public clientID: ClientID;
    public eventBus: EventBus;
    public transform: TransformHandler;

    @state()
    private _playerName: string = '';
    @state()
    private _isAlly: boolean = false;
    @state()
    private _isVisible: boolean = false;

    init(game: Game) {
        this.game = game;
        this.eventBus.on(MouseMoveEvent, e => this.onMouseEvent(e));
    }

    private onMouseEvent(event: MouseMoveEvent) {
        this._isVisible = false;
        const worldCoord = this.transform.screenToWorldCoordinates(event.x, event.y);
        if (!this.game.isOnMap(worldCoord)) {
            return;
        }
        const tile = this.game.tile(worldCoord);
        let owner = tile.owner();
        if (!owner.isPlayer()) {
            if (tile.isLand()) {
                return;
            }
            const units = this.game.units().filter(u => euclideanDist(worldCoord, u.tile().cell()) < 50).sort(distSortUnit(tile));
            if (units.length == 0) {
                return;
            }
            owner = units[0].owner();
        }
        const myPlayer = this.game.playerByClientID(this.clientID);
        if (myPlayer == null) {
            return;
        }
        this._isVisible = true;
        this._isAlly = owner == myPlayer || myPlayer.isAlliedWith(owner);
        this._playerName = owner.name();
    }

    private onExitButtonClick() {
        window.location.reload();
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
        .overlay-container {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .controls {
            position: relative;
            display: flex;
            justify-content: flex-end;
            width: 40px; /* Same as button width */
            margin-bottom: 10px;
        }
        .exit-button {
            width: 40px;
            height: 40px;
            font-size: 20px;
            font-weight: bold;
            background-color: rgba(255, 0, 0, 0.4);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: background-color 0.3s;
        }
        .exit-button:hover {
            background-color: rgba(255, 0, 0, 0.5);
        }
        .exit-button:active {
            background-color: rgba(255, 0, 0, 0.6);
        }
        .player-info {
            background-color: rgba(30, 30, 30, 0.7);
            padding: 8px 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
            color: white;
            min-width: 120px;
            text-align: left;
            font-size: 18px;
        }
        .hidden {
            opacity: 0;
            visibility: hidden;
            display: none;
        }
        .player-name {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .player-name.ally {
            color: #4CAF50;
        }
        @media (max-width: 768px) {
            .overlay-container {
                top: 5px;
                right: 5px;
            }
            .controls {
                width: 30px;
            }
            .player-info {
                padding: 6px 10px;
                font-size: 12px;
                min-width: 100px;
            }
            .exit-button {
                width: 30px;
                height: 30px;
                font-size: 16px;
            }
        }
    `;

    render() {
        return html`
            <div class="overlay-container">
                <div class="controls">
                    <button class="exit-button" @click=${this.onExitButtonClick}>×</button>
                    <!-- Future buttons can be added here -->
                </div>
                <div class="player-info ${this._isVisible ? '' : 'hidden'}">
                    <div class="player-name ${this._isAlly ? 'ally' : ''}">${this._playerName}</div>
                </div>
            </div>
        `;
    }
}