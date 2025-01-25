import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EventBus } from '../../../core/EventBus';
import { PauseGameEvent } from '../../Transport';
import { GameType } from '../../../core/game/Game';
import { GameView } from '../../../core/game/GameView';
import { Layer } from './Layer';
import { ThreadMemberFlagsBitField } from 'discord.js';
import { GameUpdateType } from '../../../core/game/GameUpdates';

@customElement('options-menu')
export class OptionsMenu extends LitElement implements Layer {
    public game: GameView;
    public eventBus: EventBus;

    @state()
    private showPauseButton: boolean = true;

    @state()
    private isPaused: boolean = false;

    @state()
    private timer: number = 0;

    private isVisible = false;

    private hasWinner = false

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
        this.isVisible = true;
        this.requestUpdate();
    }

    tick() {
        this.hasWinner = this.hasWinner || this.game.updatesSinceLastTick()[GameUpdateType.WinUpdate].length > 0
        if (this.game.inSpawnPhase()) {
            this.timer = 0
        } else if (!this.hasWinner && this.game.ticks() % 10 == 0) {
            this.timer++
        }
        this.isVisible = true;
        this.requestUpdate();
    }

    render() {
        if (!this.isVisible) {
            return html``;
        }

        return html`
            <div class="panel">
                <div class="controls">
                    <button 
                        class="control-button ${!this.showPauseButton ? 'hidden' : ''}" 
                        @click=${this.onPauseButtonClick}
                        aria-label="${this.isPaused ? 'Resume game' : 'Pause game'}"
                    >
                        ${this.isPaused ? '▶' : '⏸'}
                    </button>
                    <div class="timer">${this.timer}</div>
                    <button 
                        class="control-button" 
                        @click=${this.onExitButtonClick}
                        aria-label="Exit game"
                    >×</button>
                </div>
            </div>
        `;
    }

    static styles = css`
        :host {
            position: fixed;
            top: 20px;
            right: 10px;
            z-index: 1000;
            pointer-events: auto;
        }
        
        .panel {
            background: rgba(20, 20, 20, 0.6);
            padding: 8px;
            border-radius: 8px;
            backdrop-filter: blur(8px);
        }
        
        .controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .timer {
            width: 80px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(60, 60, 60, 0.5);
            color: rgba(255, 255, 255, 0.9);
            border-radius: 4px;
            font-size: 20px;
        }
        
        .control-button {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(60, 60, 60, 0.7);
            color: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 4px;
            font-size: 20px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .control-button:hover {
            background: rgba(80, 80, 80, 0.6);
        }
        
        .hidden {
            display: none;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        
        @media (max-width: 768px) {
            .timer {
                width: 64px;
                height: 32px;
                font-size: 16px;
            }
            
            .control-button {
                width: 32px;
                height: 32px;
                font-size: 16px;
            }
            
            .panel {
                padding: 6px;
            }
            
            .controls {
                gap: 6px;
            }
        }
    `;
}