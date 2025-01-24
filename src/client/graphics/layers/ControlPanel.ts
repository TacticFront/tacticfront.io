import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { renderNumber, renderTroops } from '../../Utils';
import { EventBus } from '../../../core/EventBus';
import { UIState } from '../UIState';
import { SendSetTargetTroopRatioEvent } from '../../Transport';
import { GameView } from '../../../core/game/GameView';

@customElement('control-panel')
export class ControlPanel extends LitElement implements Layer {
    public game: GameView;
    public clientID: ClientID;
    public eventBus: EventBus;
    public uiState: UIState;

    @state()
    private attackRatio: number = .2;

    @state()
    private targetTroopRatio = 1;

    @state()
    private currentTroopRatio = 1;

    @state()
    private _population: number;

    @state()
    private _maxPopulation: number;

    @state()
    private popRate: number;

    @state()
    private _troops: number;

    @state()
    private _workers: number;

    @state()
    private _isVisible = false;

    @state()
    private _manpower: number = 0;

    @state()
    private _gold: number;

    @state()
    private _goldPerSecond: number;

    init() {
        this.attackRatio = .20;
        this.uiState.attackRatio = this.attackRatio;
        this.currentTroopRatio = this.targetTroopRatio;
    }

    tick() {
        if (!this._isVisible && !this.game.inSpawnPhase()) {
            this.setVisibile(true);
        }

        const player = this.game.playerByClientID(this.clientID);
        if (player == null || !player.isAlive()) {
            this.setVisibile(false);
            return;
        }

        this._population = player.population();
        this._maxPopulation = this.game.config().maxPopulation(player);
        this._gold = player.gold();
        this._troops = player.troops();
        this._workers = player.workers();
        this.popRate = this.game.config().populationIncreaseRate(player) * 10;
        this._goldPerSecond = this.game.config().goldAdditionRate(player) * 10;

        this.currentTroopRatio = player.troops() / player.population();
    }

    onAttackRatioChange(newRatio: number) {
        this.uiState.attackRatio = newRatio;
    }

    renderLayer(context: CanvasRenderingContext2D) {
        // Render any necessary canvas elements
    }

    shouldTransform(): boolean {
        return false;
    }

    setVisibile(visible: boolean) {
        this._isVisible = visible;
        this.requestUpdate();
    }

    targetTroops(): number {
        return this._manpower * this.targetTroopRatio;
    }

    onTroopChange(newRatio: number) {
        this.eventBus.emit(new SendSetTargetTroopRatioEvent(newRatio));
    }

    delta(): number {
        const d = this._population - this.targetTroops();
        return d;
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
    width: 300px;
    backdrop-filter: blur(5px);
    transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
    box-sizing: border-box;
}

.hidden {
    opacity: 0;
    visibility: hidden;
}

.slider-container {
    position: relative;
    margin-bottom: 15px;
    height: 48px;
}

.slider-track {
    position: absolute;
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    top: 20px;
}

.slider-fill {
    position: absolute;
    height: 8px;
    background: rgba(0, 150, 255, 0.6);
    border-radius: 4px;
    top: 20px;
    transition: width 0.3s ease-out;
}

.slider-thumb {
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border: 2px solid rgb(0, 150, 255);
    border-radius: 50%;
    top: 16px;
    transform: translateX(-50%);
    cursor: pointer;
    transition: transform 0.1s ease;
}

.slider-thumb:hover {
    transform: translateX(-50%) scale(1.1);
}

input[type="range"] {
    position: absolute;
    width: 100%;
    top: 12px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
}

.control-panel-info {
    color: white;
    margin-bottom: 15px;
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.info-label {
    font-weight: bold;
}

label {
    display: block;
    color: white;
    margin-bottom: 5px;
}

.slider-value {
    color: white;
    text-align: right;
}

.attack-slider {
    position: relative;
    margin-bottom: 15px;
    height: 48px;
}

.attack-slider .slider-track {
    position: absolute;
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    top: 20px;
}

.attack-slider .slider-fill {
    position: absolute;
    height: 8px;
    background: rgba(255, 0, 0, 0.6);
    border-radius: 4px;
    top: 20px;
    transition: width 0.3s ease-out;
}

.attack-slider .slider-thumb {
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border: 2px solid rgb(255, 0, 0);
    border-radius: 50%;
    top: 16px;
    transform: translateX(-50%);
    cursor: pointer;
    transition: transform 0.1s ease;
}

.attack-slider .slider-thumb:hover {
    transform: translateX(-50%) scale(1.1);
}

.attack-slider input[type="range"] {
    position: absolute;
    width: 100%;
    top: 12px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
}

@media (max-width: 768px) {
    .control-panel {
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-width: 100%;
        padding: 8px;
        border-radius: 0;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5);
        margin: 0;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    .control-panel > * {
        max-width: 100%;
    }

    .slider-container {
        margin-bottom: 8px;
        height: 40px;
    }

    .slider-track, .attack-slider .slider-track {
        height: 6px;
        top: 18px;
    }

    .slider-fill, .attack-slider .slider-fill {
        height: 6px;
        top: 18px;
    }

    .slider-thumb, .attack-slider .slider-thumb {
        width: 14px;
        height: 14px;
        top: 14px;
    }

    .control-panel-info {
        margin-bottom: 8px;
        padding: 6px;
    }

    .info-row {
        margin-bottom: 2px;
    }

    label {
        margin-bottom: 2px;
        font-size: 0.9em;
    }

    .info-label {
        font-size: 0.9em;
    }

    input[type="range"], .attack-slider input[type="range"] {
        top: 10px;
    }
}
    `;

    render() {
        return html`
            <div class="control-panel ${this._isVisible ? '' : 'hidden'}">
                <div class="control-panel-info">
                    <div class="info-row">
                        <span class="info-label">Pop:</span>
                        <span>${renderTroops(this._population)} / ${renderTroops(this._maxPopulation)} (+${renderTroops(this.popRate)})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Gold:</span>
                        <span>${renderNumber(this._gold)} (+${renderNumber(this._goldPerSecond)})</span>
                    </div>
                </div>
                
                <div class="slider-container">
                    <label>Troops: ${renderTroops(this._troops)} | Workers: ${renderTroops(this._workers)}</label>
                    <div class="slider-track"></div>
                    <div class="slider-fill" style="width: ${this.currentTroopRatio * 100}%"></div>
                    <div class="slider-thumb" style="left: ${this.targetTroopRatio * 100}%"></div>
                    <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        .value=${this.targetTroopRatio * 100}
                        @input=${(e: Event) => {
                this.targetTroopRatio = parseInt((e.target as HTMLInputElement).value) / 100;
                this.onTroopChange(this.targetTroopRatio);
            }}
                    >
                </div>
                
                <div class="attack-slider">
                    <label>Attack Ratio: ${(this.attackRatio * 100).toFixed(0)}%</label>
                    <div class="slider-track"></div>
                    <div class="slider-fill" style="width: ${this.attackRatio * 100}%"></div>
                    <div class="slider-thumb" style="left: ${this.attackRatio * 100}%"></div>
                    <input 
                        type="range" 
                        min="1" 
                        max="100"
                        .value=${this.attackRatio * 100}
                        @input=${(e: Event) => {
                this.attackRatio = parseInt((e.target as HTMLInputElement).value) / 100;
                this.onAttackRatioChange(this.attackRatio);
            }}
                    >
                </div>
            </div>
        `;
    }
}