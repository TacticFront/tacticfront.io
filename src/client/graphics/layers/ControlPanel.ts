// src/client/graphics/layers/ControlPanel.ts

import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { Gold } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import { AttackRatioEvent } from "../../InputHandler";
import { SendSetTroopRatiosEvent } from "../../Transport";
import { renderNumber, renderTroops } from "../../Utils";
import { UIState } from "../UIState";
import { Layer } from "./Layer";
import "./ResearchMenu"; // Import the ResearchMenu
import { ResearchMenu } from "./ResearchMenu"; // Import the ResearchMenu class

@customElement("control-panel")
export class ControlPanel extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  public uiState: UIState;

  @state()
  private attackRatio: number = 0.2;

  @state()
  private targetTroopRatio = 0.45;

  @state()
  private reserveTroopRatio = 0.5;

  @state()
  private currentTroopRatio = 0.8;

  @state()
  private currentOffensiveTroopRatio = 0;

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
  private _offensiveTroops: number;

  @state()
  private _isVisible = false;

  @state()
  private _manpower: number = 0;

  @state()
  private _gold: Gold;

  @state()
  private _goldPerSecond: Gold;

  private _lastPopulationIncreaseRate: number;

  private _popRateIsIncreasing: boolean = true;

  private init_: boolean = false;

  init() {
    this.attackRatio = Number(
      localStorage.getItem("settings.attackRatio") ?? "0.2",
    );
    this.targetTroopRatio = Number(
      localStorage.getItem("settings.troopRatio") ?? "0.45",
    );
    this.init_ = true;
    this.uiState.attackRatio = this.attackRatio;
    this.currentTroopRatio = this.targetTroopRatio;
    this.eventBus.on(AttackRatioEvent, (event) => {
      let newAttackRatio =
        (parseInt(
          (document.getElementById("attack-ratio") as HTMLInputElement).value,
        ) +
          event.attackRatio) /
        100;

      if (newAttackRatio < 0.01) {
        newAttackRatio = 0.01;
      }

      if (newAttackRatio > 1) {
        newAttackRatio = 1;
      }

      if (newAttackRatio === 0.11 && this.attackRatio === 0.01) {
        // If we're changing the ratio from 1%, then set it to 10% instead of 11% to keep a consistency
        newAttackRatio = 0.1;
      }

      this.attackRatio = newAttackRatio;
      this.onAttackRatioChange(this.attackRatio);
    });
  }

  tick() {
    if (this.init_) {
      this.eventBus.emit(
        new SendSetTroopRatiosEvent(
          this.targetTroopRatio,
          this.reserveTroopRatio,
        ),
      );
      this.init_ = false;
    }

    if (!this._isVisible && !this.game.inSpawnPhase()) {
      this.setVisibile(true);
    }

    const player = this.game.myPlayer();
    if (player === null || !player.isAlive()) {
      this.setVisibile(false);
      return;
    }

    const popIncreaseRate = player.population() - this._population;
    if (this.game.ticks() % 5 === 0) {
      this._popRateIsIncreasing =
        popIncreaseRate >= this._lastPopulationIncreaseRate;
      this._lastPopulationIncreaseRate = popIncreaseRate;
    }

    this._population = player.population();
    this._maxPopulation = player.maxPopulation();
    this._gold = player.gold();
    this._troops = player.troops();
    this._workers = player.workers();
    this._offensiveTroops = player.offensiveTroops();
    this.popRate = player.popAdded() * 8;
    this._goldPerSecond = player.goldAdded() * 8;

    this.currentTroopRatio = player.troops() / player.population();
    this.currentOffensiveTroopRatio =
      player.offensiveTroops() / player.population();
    this.requestUpdate();
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

  onTroopChange(troopRatio: number, reserveRatio: number) {
    this.eventBus.emit(new SendSetTroopRatiosEvent(troopRatio, reserveRatio));
  }

  onTroopRatioChange(troopRatio: number) {
    this.targetTroopRatio = troopRatio;
    this.requestUpdate();
  }

  delta(): number {
    const d = this._population - this.targetTroops();
    return d;
  }

  render() {
    return html`
      <style>
        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-width: 2px;
          border-style: solid;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: white;
          border-width: 2px;
          border-style: solid;
          border-radius: 50%;
          cursor: pointer;
        }
        .targetTroopRatio::-webkit-slider-thumb {
          border-color: rgb(59 130 246);
        }
        .targetTroopRatio::-moz-range-thumb {
          border-color: rgb(59 130 246);
        }
        .attackRatio::-webkit-slider-thumb {
          border-color: rgb(239 68 68);
        }
        .attackRatio::-moz-range-thumb {
          border-color: rgb(239 68 68);
        }
      </style>
      <div
        class="${this._isVisible
          ? "w-full text-sm lg:text-m lg:w-72 bg-gray-800/70 p-2 pr-3 lg:p-4 shadow-lg lg:rounded-lg backdrop-blur"
          : "hidden"}"
        @contextmenu=${(e) => e.preventDefault()}
      >
        <div class="hidden lg:block bg-black/30 text-white mb-4 p-2 rounded">
          <div class="flex justify-between mb-1">
            <span class="font-bold"
              >${translateText("control_panel.pop")}:</span
            >
            <span translate="no"
              >${renderTroops(this._population)} /
              ${renderTroops(this._maxPopulation)}
              <span
                class="${this._popRateIsIncreasing
                  ? "text-green-500"
                  : "text-yellow-500"}"
                translate="no"
                >(+${renderTroops(this.popRate)})</span
              ></span
            >
          </div>
          <div class="flex justify-between">
            <span class="font-bold"
              >${translateText("control_panel.gold")}:</span
            >
            <span translate="no"
              >${renderNumber(this._gold)}
              (+${renderNumber(this._goldPerSecond)})</span
            >
          </div>
        </div>

        <div class="relative mb-4 lg:mb-4">
          <label class="block text-white mb-1" translate="no"
            >${translateText("control_panel.troops")}:
            <span translate="no">${renderTroops(this._troops)}</span> |
            ${translateText("control_panel.workers")}:
            <span translate="no">${renderTroops(this._workers)}</span></label
          >
          <div class="relative h-8">
            <!-- Background track -->
            <div
              class="absolute left-0 right-0 top-3 h-2 bg-white/20 rounded"
            ></div>
            <!-- Fill track -->
            <div
              class="absolute left-0 top-3 h-2 bg-red-500/80 rounded transition-all duration-300"
              style="width: ${(this.currentOffensiveTroopRatio * 100).toFixed(
                2,
              )}%;"
            ></div>
            <!-- Defensive Troops (Blue) -->
            <div
              class="absolute top-3 h-2 bg-blue-500/80 rounded transition-all duration-300"
              style="left: ${(this.currentOffensiveTroopRatio * 100).toFixed(
                2,
              )}%; width: ${(this.currentTroopRatio * 100).toFixed(2)}%;"
            ></div>
            <!-- Workers (Gray) -->
            <div
              class="absolute top-3 h-2 bg-gray-400/70 rounded transition-all duration-300"
              style="left: ${(
                (this.currentOffensiveTroopRatio + this.currentTroopRatio) *
                100
              ).toFixed(2)}%;"
            ></div>
            <!-- Range input - exactly overlaying the visual elements -->
            <input
              type="range"
              min="1"
              max="100"
              .value=${(this.targetTroopRatio * 100).toString()}
              @input=${(e: Event) => {
                this.targetTroopRatio =
                  parseInt((e.target as HTMLInputElement).value) / 100;
                this.onTroopChange(
                  this.targetTroopRatio,
                  this.reserveTroopRatio,
                );
              }}
              class="absolute left-0 right-0 top-2 m-0 h-4 cursor-pointer targetTroopRatio"
            />
          </div>
        </div>

        <div class="relative mb-0 lg:mb-4">
          <label class="block text-white mb-1" translate="no"
            >${translateText("control_panel.attack_ratio")}:
            ${(this.attackRatio * 100).toFixed(0)}%
            (${renderTroops(
              (this.game?.myPlayer()?.troops() ?? 0) * this.attackRatio,
            )})</label
          >
          <div class="relative h-8">
            <!-- Background track -->
            <div
              class="absolute left-0 right-0 top-3 h-2 bg-white/20 rounded"
            ></div>
            <!-- Fill track -->
            <div
              class="absolute left-0 top-3 h-2 bg-red-500/60 rounded transition-all duration-300"
              style="width: ${this.attackRatio * 100}%"
            ></div>
            <!-- Range input - exactly overlaying the visual elements -->
            <input
              id="attack-ratio"
              type="range"
              min="1"
              max="100"
              .value=${(this.attackRatio * 100).toString()}
              @input=${(e: Event) => {
                this.attackRatio =
                  parseInt((e.target as HTMLInputElement).value) / 100;
                this.onAttackRatioChange(this.attackRatio);
              }}
              class="absolute left-0 right-0 top-2 m-0 h-4 cursor-pointer attackRatio"
            />
          </div>
        </div>

        <div class="relative mb-0 lg:mb-4">
          <label class="block text-white mb-1" translate="no">
            Reinforcement Priority:
            ${(this.reserveTroopRatio * 100).toFixed(0)}%
          </label>
          <div class="flex items-center relative h-8 space-x-2">
            <!-- Sword Icon (Left) -->
            <span class="text-xl select-none" aria-label="Sword">🗡️</span>
            <div class="relative flex-1">
              <!-- Background track -->
              <div
                class="absolute left-0 right-0 top-3 h-2 bg-white/20 rounded"
              ></div>
              <!-- Fill track -->
              <div
                class="absolute left-0 top-3 h-2 bg-green-500/60 rounded transition-all duration-300"
                style="width: ${this.reserveTroopRatio * 100}%"
              ></div>
              <!-- Range input -->
              <input
                id="reinforcement-priority"
                type="range"
                min="1"
                max="100"
                .value=${(this.reserveTroopRatio * 100).toString()}
                @input=${(e: Event) => {
                  this.reserveTroopRatio =
                    parseInt((e.target as HTMLInputElement).value) / 100;
                  this.onTroopChange(
                    this.targetTroopRatio,
                    this.reserveTroopRatio,
                  );
                }}
                class="absolute left-0 right-0 top-2 m-0 h-4 cursor-pointer"
              />
            </div>
            <!-- Shield Icon (Right) -->
            <span class="text-xl select-none" aria-label="Shield">🛡️</span>
          </div>
        </div>

        <!-- Research Menu Button -->
        <button
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          @click=${this.toggleResearchMenu}
        >
          🔬 ${translateText("control_panel.research")}
        </button>
      </div>
      <nuke-launch-menu></nuke-launch-menu>
      <research-menu></research-menu>
    `;
  }

  createRenderRoot() {
    return this; // Disable shadow DOM to allow Tailwind styles
  }

  toggleResearchMenu() {
    const researchMenu = this.renderRoot.querySelector(
      "research-menu",
    ) as ResearchMenu;
    if (researchMenu) {
      if (researchMenu.isVisible) {
        researchMenu.hideMenu();
      } else {
        researchMenu.showMenu();
      }
    }
  }
}
