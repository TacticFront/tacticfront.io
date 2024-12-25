import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, GameType, Player, Unit, UnitType } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { EventBus } from '../../../core/EventBus';
import { TransformHandler } from '../TransformHandler';
import { MouseMoveEvent } from '../../InputHandler';
import { euclideanDist, distSortUnit } from '../../../core/Util';
import { renderNumber, renderTroops } from '../../Utils';
import { PauseGameEvent } from '../../Transport';

@customElement('player-info-overlay')
export class PlayerInfoOverlay extends LitElement implements Layer {
    @property({ type: Object })
    public game!: Game;

    @property({ type: String })
    public clientID!: ClientID;

    @property({ type: Object })
    public eventBus!: EventBus;

    @property({ type: Object })
    public transform!: TransformHandler;

    @state()
    private player: Player | null = null;

    @state()
    private unit: Unit | null = null;

    @state()
    private showPauseButton: boolean = true

    @state()
    private _isInfoVisible: boolean = false;

    @state()
    private _isPaused: boolean = false;

    private _isActive = false

    init(game: Game) {
        this.game = game;
        this.eventBus.on(MouseMoveEvent, (e: MouseMoveEvent) => this.onMouseEvent(e));
        this._isActive = true
        this.showPauseButton = this.game.config().gameConfig().gameType == GameType.Singleplayer
    }

    private onMouseEvent(event: MouseMoveEvent) {
        this.setVisible(false);
        this.unit = null;
        this.player = null;

        const worldCoord = this.transform.screenToWorldCoordinates(event.x, event.y);
        if (!this.game.isOnMap(worldCoord)) {
            return;
        }

        const tile = this.game.tile(worldCoord);
        const owner = tile.owner();

        if (owner.isPlayer()) {
            this.player = owner;
            this.setVisible(true);
        } else if (!tile.isLand()) {
            const units = this.game.units(UnitType.Destroyer, UnitType.Battleship, UnitType.TradeShip)
                .filter(u => euclideanDist(worldCoord, u.tile().cell()) < 50)
                .sort(distSortUnit(tile));

            if (units.length > 0) {
                this.unit = units[0];
                this.setVisible(true);
            }
        }
    }

    private onExitButtonClick() {
        window.location.reload();
    }

    private onPauseButtonClick() {
        this._isPaused = !this._isPaused;
        this.eventBus.emit(new PauseGameEvent(this._isPaused));
    }

    tick() {
        this.requestUpdate();
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // Implementation for Layer interface
    }

    shouldTransform(): boolean {
        return false;
    }

    setVisible(visible: boolean) {
        this._isInfoVisible = visible;
        this.requestUpdate();
    }

    private myPlayer(): Player | null {
        if (!this.game) {
            return null;
        }
        return this.game.playerByClientID(this.clientID);
    }

    private renderPlayerInfo(player: Player) {
        const isAlly = (this.myPlayer()?.isAlliedWith(player) || player == this.myPlayer()) ?? false;
        return html`
            <div class="info-content">
                <div class="player-name ${isAlly ? 'ally' : ''}">${player.name()}</div>
                <div class="type-label">Troops: ${renderTroops(player.troops())}</div>
                <div class="type-label">Gold: ${renderNumber(player.gold())}</div>
            </div>
        `;
    }

    private renderUnitInfo(unit: Unit) {
        const isAlly = (unit.owner() == this.myPlayer() || this.myPlayer()?.isAlliedWith(unit.owner())) ?? false;
        return html`
            <div class="info-content">
                <div class="player-name ${isAlly ? 'ally' : ''}">${unit.owner().name()}</div>
                <div class="unit-details">
                    <div class="type-label">${unit.type()}</div>
                    ${unit.hasHealth() ? html`
                        <div class="type-label">Health: ${unit.health()}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    render() {
        if (!this._isActive) {
            return html``
        }
        return html`
            <div class="container">
                <div class="controls">
                    <button class="control-button pause-button ${!this.showPauseButton ? 'hidden' : ''}" @click=${this.onPauseButtonClick}>
                        ${this._isPaused ? '▶' : '⏸'}
                    </button>
                    <button class="control-button exit-button" @click=${this.onExitButtonClick}>×</button>
                </div>
                <div class="player-info ${!this._isInfoVisible ? 'hidden' : ''}">
                    ${this.player != null ? this.renderPlayerInfo(this.player) : ''}
                    ${this.unit != null ? this.renderUnitInfo(this.unit) : ''}
                </div>
            </div>
        `;
    }

    static styles = css`
        :host {
            display: block;
        }

        .container {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
        }

        .controls {
            align-self: flex-end;
            margin-bottom: 4px;
            z-index: 2;
            display: flex;
            gap: 8px;
        }

        .control-button {
            background: rgba(30, 30, 30, 0.7);
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0.7;
            transition: opacity 0.2s, background-color 0.2s;
            backdrop-filter: blur(5px);
        }

        .control-button:hover {
            opacity: 1;
            background: rgba(40, 40, 40, 0.8);
        }

        .pause-button {
            font-size: 20px;
            padding: 4px 10px;
        }

        .player-info {
            background-color: rgba(30, 30, 30, 0.7);
            padding: 8px 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
            color: white;
            font-size: 18px;
            min-width: 120px;
            text-align: left;
        }

        .hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .info-content {
            margin-top: 8px;
        }

        .player-name {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .player-name.ally {
            color: #4CAF50;
        }

        .type-label {
            font-size: 14px;
            opacity: 0.8;
        }

        .unit-details {
            margin-top: 4px;
        }

        @media (max-width: 768px) {
            .container {
                top: 5px;
                right: 5px;
            }
            
            .player-info {
                padding: 6px 10px;
                font-size: 12px;
                min-width: 100px;
            }
            
            .control-button {
                font-size: 16px;
                padding: 3px 6px;
            }
            
            .pause-button {
                font-size: 14px;
                padding: 3px 8px;
            }
            
            .type-label {
                font-size: 12px;
            }
        }
    `;
}