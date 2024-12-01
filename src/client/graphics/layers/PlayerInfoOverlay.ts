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
    public transform: TransformHandler


    @state()
    private _playerName: string = '';

    @state()
    private _isAlly: boolean = false

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
        const tile = this.game.tile(worldCoord)
        let owner = tile.owner()
        if (!owner.isPlayer()) {
            if (tile.isLand()) {
                return
            }
            const units = this.game.units().filter(u => euclideanDist(worldCoord, u.tile().cell()) < 50).sort(distSortUnit(tile))
            if (units.length == 0) {
                return
            }
            owner = units[0].owner()
        }
        const myPlayer = this.game.playerByClientID(this.clientID);
        if (myPlayer == null) {
            return;
        }
        this._isVisible = true
        this._isAlly = owner == myPlayer || myPlayer.isAlliedWith(owner)
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


        .player-name.ally {
            color: #4CAF50;
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
                <div class="player-name ${this._isAlly ? 'ally' : ''}">${this._playerName}</div>
            </div>
        `;
    }
}