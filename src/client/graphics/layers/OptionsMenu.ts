import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EventBus } from '../../../core/EventBus';
import { PauseGameEvent } from '../../Transport';
import { GameType } from '../../../core/game/Game';
import { GameView } from '../../../core/game/GameView';
import { Layer } from './Layer';

@customElement('options-menu')
export class OptionsMenu extends LitElement implements Layer {
    public game: GameView;
    public eventBus: EventBus;

    @state()
    private showPauseButton: boolean = true;

    @state()
    private isPaused: boolean = false;

    private isVisible = false

    private onExitButtonClick() {
        window.location.reload();
    }

    private onPauseButtonClick() {
        this.isPaused = !this.isPaused;
        this.eventBus.emit(new PauseGameEvent(this.isPaused));
    }

    init() {
        console.log('init called from OptionsMenu')
        this.showPauseButton = this.game.config().gameConfig().gameType == GameType.Singleplayer;
        this.isVisible = true
        this.requestUpdate()
    }

    tick() {
        this.isVisible = true
        this.requestUpdate()
    }

    render() {
        if (!this.isVisible) {
            return html``
        }
        return html`
            <div class="controls">
                <button 
                    class="control-button pause-button ${!this.showPauseButton ? 'hidden' : ''}" 
                    @click=${this.onPauseButtonClick}
                    aria-label="${this.isPaused ? 'Resume game' : 'Pause game'}"
                >
                    ${this.isPaused ? '▶' : '⏸'}
                </button>
                <button 
                    class="control-button exit-button" 
                    @click=${this.onExitButtonClick}
                    aria-label="Exit game"
                >×</button>
            </div>
        `;
    }

    static styles = css`
     :host {
        position: fixed;  /* Make sure it's fixed positioning */
        top: 20px;       /* Position it where you want */
        right: 10px;     
        z-index: 1000;   /* Make sure it's higher than canvas */
        pointer-events: auto; /* Ensure it can receive clicks */
    }
        .controls {
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

        .hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        @media (max-width: 768px) {
            .control-button {
                font-size: 16px;
                padding: 3px 6px;
            }
            
            .pause-button {
                font-size: 14px;
                padding: 3px 8px;
            }
        }
    `;
}