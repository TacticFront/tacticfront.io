// src/client/graphics/layers/ResearchMenu.ts

import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import goldCoinIcon from "../../../../resources/images/GoldCoinIcon.svg";
import { EventBus } from "../../../core/EventBus";
import { GameView } from "../../../core/game/GameView";
import { researchTree, Tech } from "../../../core/types/Techs";
import { SendUnlockTechIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

@customElement("research-menu")
export class ResearchMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;

  @state()
  private _hidden = true;

  @state()
  private activeTab = 0;

  private researchTree = researchTree;

  static styles = css`
    .research-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: #1e1e1e;
      padding: 18px 28px 28px 28px;
      border-radius: 18px;
      box-shadow: 0 0 32px #000b;
      color: white;
      min-width: 430px;
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
    .close-btn {
      position: absolute;
      top: 13px;
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
    .tabs {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 4px;
      gap: 0;
      width: 100%;
      border-bottom: 2px solid #353535;
    }
    .tab {
      flex: 1 1 0;
      min-width: 110px;
      max-width: 180px;
      text-align: center;
      padding: 10px 0 8px 0;
      border-radius: 12px 12px 0 0;
      background: #232323;
      color: #ddd;
      font-weight: bold;
      cursor: pointer;
      border: 2px solid #444;
      border-bottom: none;
      margin-right: -2px;
      transition:
        background 0.18s,
        color 0.18s,
        border-color 0.15s;
      font-size: 1.07em;
    }
    .tab.active {
      background: #282a36;
      color: #f8d162;
      border-color: #444;
      border-bottom: 3px solid #f8d162;
      z-index: 1;
    }
    .tree-row {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      justify-content: center;
      gap: 0;
      width: 100%;
      margin-top: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .tech-card-wrap {
      display: flex;
      align-items: center;
    }
    .tech-connector {
      color: #444;
      font-size: 2.3em;
      margin: 0 10px;
      user-select: none;
      pointer-events: none;
    }
    .tech-card {
      min-width: 180px;
      max-width: 230px;
      height: 275px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      background: #191919;
      border: 2.5px solid #363636;
      border-radius: 16px;
      padding: 20px 15px 12px 15px;
      color: #fff;
      font-family: inherit;
      font-size: 17px;
      margin: 0;
      box-shadow: 0 2px 16px #0003;
      transition:
        border-color 0.15s,
        box-shadow 0.2s,
        background 0.14s,
        color 0.14s;
      cursor: pointer;
      position: relative;
      outline: none;
      z-index: 1;
    }
    .tech-card .icon {
      font-size: 2.8em;
      margin-bottom: 4px;
      filter: drop-shadow(0 2px 6px #0007);
    }
    .tech-card .name {
      font-weight: bold;
      text-align: center;
      font-size: 1.17em;
      margin-bottom: 4px;
      letter-spacing: 0.01em;
    }
    .tech-card .desc {
      color: #bbbbbb;
      text-align: center;
      font-size: 1em;
      margin-bottom: auto;
    }
    .tech-card .cost {
      position: absolute;
      bottom: 14px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 1em;
      color: #facc15;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .tech-card:disabled,
    .tech-card.locked {
      background: #181818;
      border-color: #272727;
      color: #666;
      opacity: 0.5;
      cursor: not-allowed;
    }
    .tech-card.unlocked {
      border-color: #27e663;
      background: #224624;
      color: #e3ffe3;
      cursor: default;
      opacity: 1;
      box-shadow: 0 0 16px #27e66344;
    }
    .tech-card.can-unlock:not(:disabled):hover,
    .tech-card.can-unlock:not(:disabled):focus {
      border-color: #ffe066;
      box-shadow: 0 0 18px #ffd93b88;
      background: #232323;
      color: #fffbe8;
    }
    .tech-card.can-unlock {
      border-color: #ffe066;
      box-shadow: 0 0 6px #ffd93b33;
      color: #fffbe8;
    }
    /* Checkmark overlay for unlocked techs (optional) */
    .tech-card.unlocked::after {
      content: "✔";
      color: #30e070;
      font-size: 1.8em;
      position: absolute;
      top: 11px;
      right: 15px;
      filter: drop-shadow(0 2px 4px #112d11);
      pointer-events: none;
      opacity: 0.88;
    }
    @media (max-width: 900px) {
      .research-menu {
        min-width: 0;
        padding: 7px 2vw 10px 2vw;
        max-width: 100vw;
      }
      .tree-row {
        flex-wrap: wrap;
        gap: 14px 0;
        justify-content: flex-start;
        overflow-x: auto;
      }
      .tech-card {
        min-width: 130px;
        max-width: 165px;
        height: 158px;
        font-size: 13px;
        padding: 11px 7px 7px 7px;
      }
      .tech-card .icon {
        font-size: 1.6em;
        margin-bottom: 3px;
        margin-top: 1px;
      }
      .tech-connector {
        font-size: 1.4em;
        margin: 0 3px;
      }
    }
    @media (max-width: 520px) {
      .tech-card {
        min-width: 96px;
        max-width: 120px;
        height: 120px;
        font-size: 10px;
        padding: 6px 2px 3px 2px;
      }
      .tech-card .icon {
        font-size: 1.1em;
        margin-bottom: 1px;
        margin-top: 0px;
      }
      .tree-row {
        gap: 7px 0;
      }
    }
  `;

  private canAfford(tech: Tech): boolean {
    const player = this.game.myPlayer();
    if (!player) return false;
    return player.gold() >= tech.cost;
  }
  private getUnlockedSet(): Set<string> {
    return this.game?.myPlayer()?.data?.unlockedTechnologies ?? new Set();
  }
  private getTechLevel(): number {
    return this.game?.myPlayer()?.data?.techLevel || 0;
  }
  private isUnlocked(techId: string): boolean {
    return this.getUnlockedSet().has(techId);
  }
  private canUnlock(row: Tech[], techIdx: number): boolean {
    const tech = row[techIdx];
    if (this.isUnlocked(row[techIdx].id)) return false;
    if (this.getTechLevel() <= techIdx) return false;
    if (!this.canAfford(tech)) return false;
    if (techIdx === 0) return true;
    return this.isUnlocked(row[techIdx - 1].id);
  }
  private unlockTech(rowIdx: number, techIdx: number) {
    const tech = this.researchTree[rowIdx][techIdx];
    if (!this.canUnlock(this.researchTree[rowIdx], techIdx)) return;
    this.eventBus.emit(new SendUnlockTechIntentEvent(tech.id));
    setTimeout(() => this.requestUpdate(), 2000);
  }
  private get tabNames(): string[] {
    return this.researchTree.map((row) => row[0]?.category || "Other");
  }

  render() {
    const categoryTabs = this.tabNames;
    const activeTab = this.activeTab;
    const currentRow = this.researchTree[activeTab];

    return html`
      <div class="research-menu ${this._hidden ? "hidden" : ""}">
        <button class="close-btn" @click=${this.hideMenu.bind(this)}>
          &times;
        </button>
        <h2>Research Tree</h2>
        <div class="tabs">
          ${categoryTabs.map(
            (cat, idx) =>
              html`<div
                class="tab ${activeTab === idx ? "active" : ""}"
                @click=${() => (this.activeTab = idx)}
              >
                ${cat}
              </div>`,
          )}
        </div>
        <div class="tree-row">
          ${currentRow.map((tech, techIdx) => {
            const unlocked = this.isUnlocked(tech.id);
            const canUnlock = this.canUnlock(currentRow, techIdx);
            return html`
              <div class="tech-card-wrap">
                <button
                  class="tech-card ${unlocked
                    ? "unlocked"
                    : canUnlock
                      ? "can-unlock"
                      : "locked"}"
                  @click=${() => {
                    if (!unlocked && canUnlock)
                      this.unlockTech(activeTab, techIdx);
                  }}
                  ?disabled=${!canUnlock || unlocked}
                  title=${unlocked
                    ? "Already unlocked"
                    : canUnlock
                      ? "Unlock"
                      : "Locked"}
                >
                  <span class="icon">${tech.icon}</span>
                  <span class="name">${tech.name}</span>
                  <span class="desc">${tech.description}</span>
                  <span class="cost">
                    ${renderNumber(tech.cost)}
                    <img
                      src=${goldCoinIcon}
                      alt="gold"
                      width="14"
                      height="14"
                      style="vertical-align: middle;"
                    />
                  </span>
                </button>
                ${techIdx < currentRow.length - 1
                  ? html`<div class="tech-connector">–</div>`
                  : ""}
              </div>
            `;
          })}
        </div>
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
  }
  tick() {}
  renderLayer(context: CanvasRenderingContext2D) {}
  shouldTransform(): boolean {
    return false;
  }
  get isVisible() {
    return !this._hidden;
  }
}
