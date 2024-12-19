import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, Player, Unit } from '../../../core/game/Game';
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
    private selectedType: "player" | "unit" | null = null

    @state()
    private player: Player

    @state()
    private unit: Unit

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
        this._isVisible = true;
    }

    private onExitButtonClick() {
        window.location.reload();
    }

    tick() {
        this.unit = this.unit
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
            .exit-button {
                width: 30px;
                height: 30px;
                font-size: 16px;
            }
        }
    `;

    private renderPlayerInfo(player: Player) {
        return html`
            <div class="info-content">
                <div class="name ${player.isAlly ? 'ally' : 'enemy'}">${player.name}</div>
                <div class="type-label">Player Territory</div>
            </div>
        `;
    }

    private renderUnitInfo(unit: Unit) {
        return html`
            <div class="info-content">
                <div class="name ${unit.isAlly ? 'ally' : 'enemy'}">${unit.owner}</div>
                <div class="unit-details">
                    <div class="type-label">${unit.type}</div>
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${unit.health}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        return html`
            <div class="overlay-container">
                <div class="controls">
                    <button class="exit-button" @click=${this.onExitButtonClick}>×</button>
                </div>
                <div class="info-panel ${this._infoType === 'none' ? 'hidden' : ''}">
                    ${this._infoType === 'player' && this._playerInfo
                ? this.renderPlayerInfo(this._playerInfo)
                : this._infoType === 'unit' && this._unitInfo
                    ? this.renderUnitInfo(this._unitInfo)
                    : nothing}
                </div>
            </div>
        `;
    }
}