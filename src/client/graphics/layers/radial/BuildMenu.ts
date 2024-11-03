import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { EventBus } from '../../../../core/EventBus';
import { Cell, Game, Player } from '../../../../core/game/Game';
import { SendNukeIntentEvent } from '../../../Transport';

interface BuildItem {
    id: string;
    name: string;
    icon: string;
    cost: number;
    buildTime: number;
}

const buildTable: BuildItem[][] = [
    [
        { id: 'missile', name: 'Missile', icon: '🚀', cost: 100, buildTime: 5 },
        { id: 'battleship', name: 'Battleship', icon: '🚢', cost: 500, buildTime: 20 }
    ]
];

@customElement('build-menu')
export class BuildMenu extends LitElement {
    public game: Game;
    public eventBus: EventBus


    private myPlayer: Player
    private clickedCell: Cell

    static styles = css`
        :host {
            display: block;
        }
        .build-menu {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background-color: #1E1E1E;
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 95vw;
            max-height: 95vh;
            overflow-y: auto;
        }
        .build-row {
            display: flex;
            justify-content: center;
            width: 100%;
        }
        .build-button {
            width: 120px;
            height: 120px;
            border: 2px solid #444;
            background-color: #2C2C2C;
            color: white;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 8px;
            padding: 10px;
        }
        .build-button:hover {
            background-color: #3A3A3A;
            transform: scale(1.05);
            border-color: #666;
        }
        .build-button:active {
            background-color: #4A4A4A;
            transform: scale(0.95);
        }
        .build-icon {
            font-size: 40px;
            margin-bottom: 5px;
        }
        .build-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .build-cost {
            font-size: 12px;
            color: #FFD700;
        }
        .hidden {
            display: none !important;
        }
            
        @media (max-width: 600px) {
            .build-button {
                width: 100px;
                height: 100px;
                margin: 5px;
            }
            .build-icon {
                font-size: 32px;
            }
            .build-name {
                font-size: 12px;
            }
            .build-cost {
                font-size: 10px;
            }
        }
        @media (max-width: 400px) {
            .build-button {
                width: 80px;
                height: 80px;
                margin: 3px;
            }
            .build-icon {
                font-size: 28px;
            }
        }
    `;

    @state()
    private _hidden = true;

    public onBuildSelected: (item: BuildItem) => void = () => {
        this.eventBus.emit(new SendNukeIntentEvent(this.myPlayer, this.clickedCell, null))
        this.hideMenu()
    };

    render() {
        return html`
            <div class="build-menu ${this._hidden ? 'hidden' : ''}">
                ${buildTable.map(row => html`
                    <div class="build-row">
                        ${row.map(item => html`
                            <button class="build-button" @click=${() => this.onBuildSelected(item)}>
                                <span class="build-icon">${item.icon}</span>
                                <span class="build-name">${item.name}</span>
                                <span class="build-cost">${item.cost} 💰</span>
                            </button>
                        `)}
                    </div>
                `)}
            </div>
        `;
    }

    hideMenu() {
        this._hidden = true;
        this.requestUpdate();
    }

    showMenu(player: Player, clickedCell: Cell) {
        this.myPlayer = player
        this.clickedCell = clickedCell
        this._hidden = false;
        this.requestUpdate();
    }

    get isVisible() {
        return !this._hidden;
    }
}