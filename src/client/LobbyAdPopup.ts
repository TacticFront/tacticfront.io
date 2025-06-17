// src/client/LobbyAdPopup.ts

import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { consolex } from "../core/Consolex";
import { GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";

const DISMISS_KEY = "lobby-ad-dismissed-until";
const POPUP_SHOWN_IDS_KEY = "lobby-ad-shown-gameids";
const DISMISS_MINUTES = 30;

function getPopupShownIds(): GameID[] {
  try {
    return JSON.parse(localStorage.getItem(POPUP_SHOWN_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function addPopupShownId(id: GameID) {
  const ids = getPopupShownIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(POPUP_SHOWN_IDS_KEY, JSON.stringify(ids));
  }
}

@customElement("lobby-ad")
export class LobbyAdPopup extends LitElement {
  @state() private lobbies: GameInfo[] = [];
  @state() public isLobbyHighlighted: boolean = false;
  @state() private isButtonDebounced: boolean = false;
  @state() private showJoinModal: boolean = false;
  private lobbiesInterval: number | null = null;
  private currLobby: GameInfo | null = null;
  private debounceDelay: number = 750;
  private lobbyIDToStart = new Map<GameID, number>();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.fetchAndUpdateLobbies();
    this.lobbiesInterval = window.setInterval(
      () => this.fetchAndUpdateLobbies(),
      2000,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.lobbiesInterval !== null) {
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  private shouldHideForCurrentPage(lobby: GameInfo): boolean {
    const path = window.location.pathname;
    if (path === "/" || path === `/join/${lobby.gameID}`) {
      return true;
    }
    // Also allow for hash, search, etc if you want (optional)
    return false;
  }

  private isDismissed(): boolean {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  }

  private async fetchAndUpdateLobbies(): Promise<void> {
    if (this.isDismissed()) {
      this.showJoinModal = false;
      return;
    }
    try {
      this.lobbies = await this.fetchLobbies();
      this.lobbies.forEach((l) => {
        // Store the start time on first fetch because endpoint is cached, causing
        // the time to appear irregular.
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
        }
        const start = this.lobbyIDToStart.get(l.gameID) ?? 0;
        const timeRemaining = Math.max(
          0,
          Math.floor((start - Date.now()) / 1000),
        );
        const alreadyShown = getPopupShownIds().includes(l.gameID);

        if (
          (l.numClients || 0) > 0 &&
          timeRemaining >= 30 &&
          !alreadyShown &&
          !this.shouldHideForCurrentPage(l)
        ) {
          this.showJoinModal = true;
          addPopupShownId(l.gameID);
        }
      });
    } catch (error) {
      consolex.error("Error fetching lobbies:", error);
    }
  }

  async fetchLobbies(): Promise<GameInfo[]> {
    try {
      const response = await fetch(`/api/public_lobbies`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.lobbies;
    } catch (error) {
      consolex.error("Error fetching lobbies:", error);
      throw error;
    }
  }

  public stop() {
    if (this.lobbiesInterval !== null) {
      this.isLobbyHighlighted = false;
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  private handleJoinClick() {
    if (this.lobbies.length > 0) {
      const lobby = this.lobbies[0];
      // Assuming the game URL is structured like this. Adjust if necessary.
      window.open(`/join/${lobby.gameID}`, "_blank");
    }
    this.showJoinModal = false;
  }

  private handleDismissForNow() {
    // Dismiss for 30 minutes
    const until = Date.now() + DISMISS_MINUTES * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    this.showJoinModal = false;
  }

  private handleCloseModal() {
    this.showJoinModal = false;
  }

  render() {
    if (!this.showJoinModal || this.lobbies.length === 0) return html``;

    const lobby = this.lobbies[0];
    if (!lobby?.gameConfig) return;
    if (this.shouldHideForCurrentPage(lobby)) return html``;
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const teamCount =
      lobby.gameConfig.gameMode === GameMode.Team
        ? lobby.gameConfig.playerTeams || 0
        : null;

    // Optionally display a map image if available
    const mapName = lobby.gameConfig.gameMap;
    // If you have a map image utility: getMapsImage(mapName)
    // const mapImageUrl = getMapsImage ? getMapsImage(mapName) : null;
    const mapImageUrl = undefined; // TODO: swap this with your image util if available

    return html`
      <div
        class="fixed inset-0 bg-black/70 z-[100] flex justify-center items-center"
      >
        <div
          class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 relative flex flex-col items-center border-2 border-blue-600"
        >
          <button
            class="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl"
            style="line-height:1"
            @click=${this.handleCloseModal}
            aria-label="Dismiss"
            title="Close"
            tabindex="0"
          >
            &times;
          </button>
          <!-- Optional: Map image -->
          ${mapImageUrl
            ? html`<img
                src="${mapImageUrl}"
                alt="${mapName}"
                class="rounded-lg mb-4 object-cover w-full max-h-32"
              />`
            : null}
          <h2
            class="text-2xl md:text-3xl font-bold mb-3 text-blue-700 dark:text-blue-300"
          >
            🚩 Join Public Lobby
          </h2>
          <div class="text-gray-600 dark:text-gray-300 mb-2 text-base">
            A public lobby is waiting for players.<br />
            Would you like to join?
          </div>
          <div class="mb-4 text-blue-700 dark:text-blue-200 text-sm">
            <span
              >If you join, the public lobby will open in a <b>new tab</b> so
              you can return to your game later.</span
            >
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-left w-full mb-4">
            <div class="font-semibold text-gray-700 dark:text-gray-200">
              Game ID:
            </div>
            <div class="text-blue-700 dark:text-blue-400 truncate">
              ${lobby.gameID}
            </div>

            <div class="font-semibold text-gray-700 dark:text-gray-200">
              Map:
            </div>
            <div>
              ${translateText(
                `map.${mapName.toLowerCase().replace(/\s+/g, "")}`,
              )}
            </div>

            <div class="font-semibold text-gray-700 dark:text-gray-200">
              Mode:
            </div>
            <div>
              <span
                class="font-medium ${this.isLobbyHighlighted
                  ? "text-green-600"
                  : "text-blue-600"}"
              >
                ${lobby.gameConfig.gameMode === GameMode.Team
                  ? translateText("public_lobby.teams", { num: teamCount ?? 0 })
                  : translateText("game_mode.ffa")}
              </span>
            </div>

            <div class="font-semibold text-gray-700 dark:text-gray-200">
              Players:
            </div>
            <div>
              ${lobby.numClients ?? 0} / ${lobby.gameConfig.maxPlayers ?? "?"}
            </div>

            <div class="font-semibold text-gray-700 dark:text-gray-200">
              Starts in:
            </div>
            <div class="text-blue-600 dark:text-blue-300">${timeDisplay}</div>
          </div>
          <div class="flex gap-6 justify-center w-full mt-4">
            <button
              class="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-700 hover:to-green-500 transition-colors text-white px-6 py-2 rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              @click=${this.handleJoinClick}
            >
              Join Now
            </button>
            <button
              class="bg-gradient-to-r from-gray-400 to-gray-700 hover:from-red-500 hover:to-red-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-red-400"
              @click=${this.handleDismissForNow}
            >
              Dismiss for 30 Min
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
