import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Player } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { GameView, PlayerView } from '../../../core/game/GameView';
import { Layer } from './Layer';
import { GameUpdateType } from '../../../core/game/GameUpdates';

@customElement('win-modal')
export class WinModal extends LitElement implements Layer {
    public clientID: ClientID
    public game: GameView
    private winner: PlayerView

    @state()
    isVisible = false

    static styles = css`
        :host {
            display: block;
        }

        .modal {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(30, 30, 30, 0.7);
            padding: 25px;
            border-radius: 10px;
            z-index: 9999;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            color: white;
            width: 300px;
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        }

        .modal.visible {
            display: block;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translate(-50%, -48%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }

        h2 {
            margin: 0 0 15px 0;
            font-size: 24px;
            text-align: center;
            color: white;
        }

        p {
            margin: 0 0 20px 0;
            text-align: center;
            background-color: rgba(0, 0, 0, 0.3);
            padding: 10px;
            border-radius: 5px;
        }

        .button-container {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }

        button {
            flex: 1;
            padding: 12px;
            font-size: 16px;
            cursor: pointer;
            background: rgba(0, 150, 255, 0.6);
            color: white;
            border: none;
            border-radius: 5px;
            transition: background-color 0.2s ease, transform 0.1s ease;
        }

        button:hover {
            background: rgba(0, 150, 255, 0.8);
            transform: translateY(-1px);
        }

        button:active {
            transform: translateY(1px);
        }

        @media (max-width: 768px) {
            .modal {
                width: 90%;
                max-width: 300px;
                padding: 20px;
            }

            h2 {
                font-size: 20px;
            }

            button {
                padding: 10px;
                font-size: 14px;
            }
        }
    `;

    render() {
        if (!this.winner) return null;
        const isWinner = this.winner.clientID() === this.clientID;
        const title = isWinner ? 'You Won!!!' : 'You Lost!!!';
        const message = `${this.winner.name()} won the game!`;

        return html`
            <div class="modal ${this.isVisible ? 'visible' : ''}">
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="button-container">
                    <button @click=${this._handleExit}>Exit Game</button>
                    <button @click=${this._handleContinue}>Keep Playing</button>
                </div>
            </div>
        `;
    }

    show(winner: PlayerView) {
        this.winner = winner;
        this.isVisible = true;
        this.requestUpdate();
    }

    hide() {
        this.isVisible = false;
        this.requestUpdate();
    }

    private _handleExit() {
        this.hide();
        window.location.reload();
    }

    private _handleContinue() {
        this.hide();
    }

    init() { }

    tick() {
        this.game.updatesSinceLastTick()[GameUpdateType.WinUpdate]
            .forEach(wu => this.show(this.game.playerBySmallID(wu.winnerID) as PlayerView))
    }

    renderLayer(context: CanvasRenderingContext2D) {
    }

    shouldTransform(): boolean {
        return false
    }
}