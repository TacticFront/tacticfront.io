// src/client/graphics/layers/ResearchMenu.ts

import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { GameView } from "../../../core/game/GameView";
import { researchTree, Tech } from "../../../core/types/Techs";
import { SendUnlockTechIntentEvent } from "../../Transport";
import { Layer } from "./Layer";

@customElement("research-menu")
export class ResearchMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;

  @state()
  private _hidden = true;

  static styles = css`
    .research-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: #1e1e1e;
      padding: 18px 28px 28px 28px;
      border-radius: 14px;
      box-shadow: 0 0 24px #0009;
      color: white;
      min-width: 450px;
      min-height: 220px;
      max-width: 98vw;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }
    .hidden {
      display: none !important;
    }
    .tree-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
      min-height: 60px;
    }
    .tech {
      background: #222;
      border: 2px solid #444;
      border-radius: 10px;
      padding: 10px 14px;
      min-width: 120px;
      min-height: 58px;
      text-align: center;
      opacity: 1;
      transition:
        border 0.15s,
        background 0.15s,
        opacity 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      box-shadow: 0 2px 8px #0004;
      font-size: 16px;
      position: relative;
    }
    .tech.locked {
      background: #191919;
      border-color: #333;
      opacity: 0.5;
      cursor: not-allowed;
      color: #999;
    }
    .tech .icon {
      font-size: 2rem;
      margin-bottom: 3px;
    }
    .tech.unlocked {
      border-color: #27e663;
      background: #224624;
      color: #e3ffe3;
    }
    .close-btn {
      position: absolute;
      top: 12px;
      right: 22px;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 2rem;
      font-weight: bold;
      cursor: pointer;
      z-index: 2;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #ff6565;
    }
    h2 {
      text-align: center;
      margin: 0 0 16px 0;
    }
    .tree-row-label {
      min-width: 105px;
      margin-right: 14px;
      font-weight: bold;
      color: #97dfff;
      text-align: right;
    }
    /* Optional: connector lines between techs can be added with :after or SVG */
  `;

  // Place your researchTree definition here
  private researchTree = researchTree;

  constructor() {
    super();
  }

  private canAfford(tech: Tech): boolean {
    const player = this.game.myPlayer();
    if (!player) return false;
    // player.gold() is bigint, so convert cost to bigint
    return player.gold() >= BigInt(tech.cost);
  }

  private getUnlockedSet(): Set<string> {
    return this.game?.myPlayer()?.data?.unlockedTechnologies ?? new Set();
  }

  private getTechLevel(): number {
    return this.game?.myPlayer()?.data?.techLevel || 0;
  }

  // Returns true if this tech is already unlocked (either locally or from player data)
  private isUnlocked(techId: string): boolean {
    return this.getUnlockedSet().has(techId);
  }

  // Returns true if this tech is RESEARCHABLE (not already unlocked, and previous in row is unlocked)
  private canUnlock(row: Tech[], techIdx: number): boolean {
    const tech = row[techIdx];
    console.log(
      this.isUnlocked(row[techIdx].id),
      this.getTechLevel(),
      row,
      techIdx,
    );
    if (this.isUnlocked(row[techIdx].id)) return false; // Already unlocked
    const techLevel = this.getTechLevel();

    // Must have sufficient techLevel to unlock this tier
    if (techLevel <= techIdx) return false;

    if (!this.canAfford(tech)) return false;

    // First tech in row: only techLevel check is needed
    if (techIdx === 0) return true;

    // Otherwise, require previous tech in row
    return this.isUnlocked(row[techIdx - 1].id);
  }

  private unlockTech(rowIdx: number, techIdx: number) {
    const tech = this.researchTree[rowIdx][techIdx];
    const canUnlock = this.canUnlock(this.researchTree[rowIdx], techIdx);
    console.log("Unlock Tech", tech.id, canUnlock);
    if (!this.canUnlock(this.researchTree[rowIdx], techIdx)) return;
    this.eventBus.emit(new SendUnlockTechIntentEvent(tech.id));
    setTimeout(() => {
      this.requestUpdate();
    }, 2000);
  }

  render() {
    return html`
      <div class="research-menu ${this._hidden ? "hidden" : ""}">
        <button class="close-btn" @click=${this.hideMenu.bind(this)}>
          &times;
        </button>
        <h2>Research Tree</h2>
        ${this.researchTree.map(
          (row, rowIdx) => html`
            <div class="tree-row">
              <span class="tree-row-label">${row[0].category}</span>
              ${row.map((tech, techIdx) => {
                const unlocked = this.isUnlocked(tech.id);
                const canUnlock = this.canUnlock(row, techIdx);
                return html`
                  <div
                    class="tech ${unlocked
                      ? "unlocked"
                      : canUnlock
                        ? ""
                        : "locked"}"
                    @click=${() => {
                      if (!unlocked && canUnlock)
                        this.unlockTech(rowIdx, techIdx);
                    }}
                  >
                    <span class="icon">${tech.icon}</span>
                    <span class="name">${tech.name}</span>
                    <span class="desc" style="font-size:0.92em;color:#bbb"
                      >${tech.description}</span
                    >
                    <span class="cost" style="font-size:0.9em;color:#facc15"
                      >Cost: ${tech.cost}</span
                    >
                  </div>
                  ${techIdx < row.length - 1
                    ? html`<span style="width:22px;display:inline-block;"
                        ><svg width="18" height="14">
                          <path
                            d="M2 7h14"
                            stroke="#888"
                            stroke-width="3"
                            stroke-linecap="round"
                            fill="none"
                          /></svg
                      ></span>`
                    : null}
                `;
              })}
            </div>
          `,
        )}
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }

  showMenu() {
    this._hidden = false;
    this.requestUpdate();
    console.log(this.game?.myPlayer()?.data.unlockedTechnologies);
  }

  tick() {
    // Implement tick logic if needed for updates
  }

  renderLayer(context: CanvasRenderingContext2D) {
    // Implement renderLayer logic if needed for canvas drawing
  }

  shouldTransform(): boolean {
    return false; // Or true, depending on how this layer should behave
  }

  get isVisible() {
    return !this._hidden;
  }
}
