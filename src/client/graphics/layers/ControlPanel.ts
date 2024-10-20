import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Layer} from './Layer';
import {Game} from '../../../core/game/Game';
import {ClientID} from '../../../core/Schemas';

@customElement('control-panel')
export class ControlPanel extends LitElement implements Layer {
    private game: Game
    public clientID: ClientID

    @state()
    private _numTroops = 50;

    @state()
    private _isVisible = false;

    init(game: Game) {
        this.game = game
    }

    tick() {
        // Update game state based on numTroops value if needed
        if (!this._isVisible && !this.game.inSpawnPhase()) {
            this.toggleVisibility()
        }
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // Render any necessary canvas elements
    }

    shouldTransform(): boolean {
        return false
    }

    toggleVisibility() {
        this._isVisible = !this._isVisible;
        this.requestUpdate();
    }

    static styles = css`
        :host {
            display: block;
        }
        .control-panel {
            position: fixed;
            bottom: 10px;
            left: 10px;
            z-index: 9999;
            background-color: rgba(30, 30, 30, 0.7);
            padding: 15px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            border-radius: 10px;
            width: 250px;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        }
        .hidden {
            opacity: 0;
            visibility: hidden;
        }
        .slider-container {
            margin-bottom: 15px;
        }
        label {
            display: block;
            color: white;
            margin-bottom: 5px;
        }
        input[type="range"] {
            width: 100%;
        }
        .slider-value {
            color: white;
            text-align: right;
        }
    `;

    render() {
        return html`
            <div class="control-panel ${this._isVisible ? '' : 'hidden'}">
                <div class="slider-container">
                    <label for="numTroops">Number of Troops</label>
                    <input type="range" id="numTroops" min="0" max="100" .value=${this._numTroops}
                           @input=${(e: Event) => this._numTroops = parseInt((e.target as HTMLInputElement).value)}>
                </div>
            </div>
        `;
    }
}