// src/client/graphics/layers/StrikePackageMenu.ts

// src/client/graphics/layers/StrikePackageMenu.ts

import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { TileRef } from "../../../core/game/GameMap";
import { GameView, PlayerView } from "../../../core/game/GameView";
import { StrikePackageType } from "../../../core/types/StrikePackageType";
import { SendStrikePackageIntentEvent } from "../../Transport";
import { Layer } from "./Layer";

import atomBombIcon from "../../../../resources/images/MissileSiloIconWhite.svg";

// src/client/graphics/layers/StrikePackageMenu.ts

export const strikePackages: {
  type: StrikePackageType;
  icon: string;
  name: string;
  description: string;
}[] = [
  {
    type: StrikePackageType.CruiseMissile,
    icon: atomBombIcon, // Use your real icon here
    name: "Cruise Missile",
    description: "Strike enemy defense posts with one missile each.",
  },
  {
    type: StrikePackageType.AtomBomb,
    icon: atomBombIcon, // Use your real icon here
    name: "Atom Bomb",
    description: "Send an Atom bomb and decoy missile at each enemy cities.",
  },
  {
    type: StrikePackageType.MilitaryStrike,
    icon: atomBombIcon, // Use your real icon here
    name: "Military Strike",
    description: "Target Sams, Silos and Defense Posts of enemy.",
  },
  {
    type: StrikePackageType.ScorchedEarth,
    icon: atomBombIcon, // Use your real icon here
    name: "Scorched Earth",
    description: "Target Sams then target enemy cities.",
  },
];

@customElement("strike-package-menu")
export class StrikePackageMenu extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;
  public clickedTile: TileRef;
  @state()
  private _hidden = true;
  @state()
  private _selected: StrikePackageType | null = null;

  tick() {
    if (!this._hidden) {
      this.refresh();
    }
  }

  static styles = css`
    /* ... Style similar to BuildMenu ... */
    .close-btn {
      position: absolute;
      top: 10px;
      right: 14px;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 2rem;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      z-index: 2;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #ff0000;
    }
    .strike-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10001; /* must be higher than 9999 */
      background: #191919;
      min-width: 350px;
      min-height: 220px;
      padding: 16px;
      border-radius: 10px;
      box-shadow: 0 0 24px #000;
    }
    .hidden {
      display: none !important;
    }

    .strike-option {
      /* Style for each package option */
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 6px;
      border: 2px solid #333;
      margin-bottom: 10px;
      transition:
        background 0.2s,
        border 0.2s;
    }
    .strike-option.selected {
      background: #b91c1c;
      border-color: #ff0000;
    }
    .strike-icon {
      width: 48px;
      height: 48px;
      margin-right: 16px;
    }
    .strike-launch {
      margin-top: 20px;
      padding: 12px 36px;
      background: #b91c1c;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
    }
    .strike-launch:disabled {
      background: #6b1a1a;
      cursor: not-allowed;
    }

    .strike-option.selected {
      background: #b91c1c;
      border-color: #ff0000;
      color: #fff; /* <--- add this */
    }

    .strike-option.selected strong,
    .strike-option.selected div {
      color: #fff !important;
    }

    .strike-option {
      background: #222;
      color: #ccc;
    }

    .strike-option:not(.selected) strong,
    .strike-option:not(.selected) div {
      color: #ccc;
    }

    .white-text {
      color: white;
    }
  `;

  showMenu(clickedTile: TileRef) {
    this.clickedTile = clickedTile;
    this._selected = null;
    this._hidden = false;
    this.requestUpdate();
  }
  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }
  get isVisible() {
    return !this._hidden;
  }

  private refresh() {
    this.game
      .myPlayer()
      ?.actions(this.clickedTile)
      .then((actions) => {
        this.requestUpdate();
      });
  }

  private onSelect(type: StrikePackageType) {
    this._selected = type;
  }
  private onLaunch() {
    if (!this._selected) return;
    //You may want to pass the owner ID or player, but for now use null for targetID
    const target = this.game.owner(this.clickedTile);
    if (!target || !(target instanceof PlayerView)) {
      console.error("No target player found for clicked tile");
      return;
    }
    console.log(target);
    console.log(target.id());
    this.eventBus.emit(
      new SendStrikePackageIntentEvent(target.id(), this._selected),
    );
    this.hideMenu();
  }

  render() {
    return html`
      <div class="strike-menu ${this._hidden ? "hidden" : ""}">
        <button
          class="close-btn"
          @click=${this.hideMenu.bind(this)}
          title="Close"
        >
          &times;
        </button>
        <h2 class="white-text">Select Strike Package</h2>
        ${strikePackages.map(
          (sp) => html`
            <div
              class="strike-option ${this._selected === sp.type
                ? "selected"
                : ""}"
              @click=${() => this.onSelect(sp.type)}
            >
              <img src=${sp.icon} class="strike-icon" />
              <div>
                <div><strong>${sp.name}</strong></div>
                <div>${sp.description}</div>
              </div>
            </div>
          `,
        )}
        <button
          class="strike-launch"
          ?disabled=${!this._selected}
          @click=${() => this.onLaunch()}
        >
          LAUNCH
        </button>
      </div>
    `;
  }
}
