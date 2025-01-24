import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, GameType, Player, PlayerProfile, PlayerType, Relation, Unit, UnitType } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { EventBus } from '../../../core/EventBus';
import { TransformHandler } from '../TransformHandler';
import { MouseMoveEvent } from '../../InputHandler';
import { GameView, PlayerView, UnitView } from '../../../core/game/GameView';
import { TileRef } from '../../../core/game/GameMap';
import { renderNumber, renderTroops } from '../../Utils';

function euclideanDistWorld(coord: { x: number, y: number }, tileRef: TileRef, game: GameView): number {
    const x = game.x(tileRef);
    const y = game.y(tileRef);
    const dx = coord.x - x;
    const dy = coord.y - y;
    return Math.sqrt(dx * dx + dy * dy);
}

function distSortUnitWorld(coord: { x: number, y: number }, game: GameView) {
    return (a: Unit | UnitView, b: Unit | UnitView) => {
        const distA = euclideanDistWorld(coord, a.tile(), game);
        const distB = euclideanDistWorld(coord, b.tile(), game);
        return distA - distB;
    };
}

@customElement('player-info-overlay')
export class PlayerInfoOverlay extends LitElement implements Layer {
    @property({ type: Object })
    public game!: GameView;

    @property({ type: String })
    public clientID!: ClientID;

    @property({ type: Object })
    public eventBus!: EventBus;

    @property({ type: Object })
    public transform!: TransformHandler;

    @state()
    private player: PlayerView | null = null;

    @state()
    private playerProfile: PlayerProfile | null = null;

    @state()
    private unit: UnitView | null = null;

    @state()
    private _isInfoVisible: boolean = false;

    private _isActive = false;

    private lastMouseUpdate = 0

    init() {
        this.eventBus.on(MouseMoveEvent, (e: MouseMoveEvent) => this.onMouseEvent(e));
        this._isActive = true;
    }

    private onMouseEvent(event: MouseMoveEvent) {
        const now = Date.now()
        if (now - this.lastMouseUpdate < 100) {
            return
        }
        this.lastMouseUpdate = now


        this.setVisible(false);
        this.unit = null;
        this.player = null;

        const worldCoord = this.transform.screenToWorldCoordinates(event.x, event.y);
        if (!this.game.isValidCoord(worldCoord.x, worldCoord.y)) {
            return;
        }

        const tile = this.game.ref(worldCoord.x, worldCoord.y);
        if (!tile) return;

        const owner = this.game.owner(tile);

        if (owner && owner.isPlayer()) {
            this.player = owner as PlayerView;
            this.player.profile().then(p => {
                this.playerProfile = p;
            });
            this.setVisible(true);
        } else if (!this.game.isLand(tile)) {
            const units = this.game.units(UnitType.Destroyer, UnitType.Battleship, UnitType.TradeShip)
                .filter(u => euclideanDistWorld(worldCoord, u.tile(), this.game) < 50)
                .sort(distSortUnitWorld(worldCoord, this.game));

            if (units.length > 0) {
                this.unit = units[0];
                this.setVisible(true);
            }
        }
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

    private myPlayer(): PlayerView | null {
        if (!this.game) {
            return null;
        }
        return this.game.playerByClientID(this.clientID);
    }

    private renderPlayerInfo(player: PlayerView) {
        const myPlayer = this.myPlayer();
        const isAlly = myPlayer?.isAlliedWith(player)
        let relationHtml = null;
        if (player.type() == PlayerType.FakeHuman && myPlayer != null) {
            let classType = '';
            let relationName = '';
            const relation = this.playerProfile?.relations[myPlayer.smallID()] ?? Relation.Neutral;
            switch (relation) {
                case Relation.Hostile:
                    classType = 'hostile';
                    relationName = 'Hostile';
                    break;
                case Relation.Distrustful:
                    classType = 'distrustful';
                    relationName = 'Distrustful';
                    break;
                case Relation.Neutral:
                    classType = 'neutral';
                    relationName = 'Neutral';
                    break;
                case Relation.Friendly:
                    classType = 'friendly';
                    relationName = 'Friendly';
                    break;
            }

            relationHtml = html`<div class="type-label">Attitude: <span class="${classType}">${relationName}</span></div>`;
        }
        return html`
        <div class="info-content">
            <div class="player-name ${isAlly ? 'ally' : ''}">${player.name()}</div>
            <div class="type-label">Troops: ${renderTroops(player.troops())}</div>
            <div class="type-label">Gold: ${renderNumber(player.gold())}</div>
            ${relationHtml == null ? '' : relationHtml}
        </div>
        `;
    }

    private renderUnitInfo(unit: UnitView) {
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
            return html``;
        }
        return html`
        <div class="container">
            <options-menu
                .game=${this.game}
                .eventBus=${this.eventBus}
            ></options-menu>
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
            top: 70px;
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

        .hostile {
            color: #ff4444;
        }
        .distrustful {
            color: #ff8888;
        }
        .neutral {
            color: #ffffff;
        }
        .friendly {
            color: #4CAF50;
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