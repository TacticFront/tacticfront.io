// src/client/PublicLobby.ts

import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { consolex } from "../core/Consolex";
import { GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { JoinLobbyEvent } from "./Main";
import { getMapsImage } from "./utilities/Maps";

@customElement("public-lobby")
export class PublicLobby extends LitElement {
  @state() private publicLobbies: GameInfo[] = [];
  @state() private privateLobbies: GameInfo[] = [];

  @state() public isLobbyHighlighted: boolean = false;
  @state() private isButtonDebounced: boolean = false;
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
      1000,
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.lobbiesInterval !== null) {
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  private async fetchAndUpdateLobbies(): Promise<void> {
    try {
      const lobbies = await this.fetchLobbies();
      this.publicLobbies = lobbies.filter((l) => l.lobbyType === "public");
      this.privateLobbies = lobbies.filter((l) => l.lobbyType === "private");
      // ...preserve your lobbyIDToStart logic for both
      [...lobbies].forEach((l) => {
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
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

  render() {
    // Show nothing if empty
    if (this.publicLobbies.length === 0 && this.privateLobbies.length === 0)
      return html``;

    // Card component for a lobby
    const renderLobbyCard = (lobby: GameInfo, isPublic: boolean) => {
      if (!lobby?.gameConfig) return;
      const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
      const timeRemaining = Math.max(
        0,
        Math.floor((start - Date.now()) / 1000),
      );
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const timeDisplay =
        minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      const teamCount =
        lobby.gameConfig.gameMode === GameMode.Team
          ? lobby.gameConfig.playerTeams || 0
          : null;

      //style="mask-image: linear-gradient(to left, transparent, #fff)"

      return html`
        <div
          class="flex flex-col bg-yellow-900/10 border border-yellow-700 rounded-xl shadow-lg mb-6 overflow-hidden relative group transition hover:scale-[1.02] duration-150"
        >
          <!-- Map image background -->
          <div class="relative h-40 md:h-56 overflow-hidden">
            <img
              src="${getMapsImage(lobby.gameConfig.gameMap)}"
              alt="${lobby.gameConfig.gameMap}"
              class="object-cover w-full h-full brightness-90 group-hover:brightness-100 transition"
            />
            <div class="absolute top-2 left-2">
              <span
                class="px-3 py-1 text-xs rounded-full font-bold
              ${isPublic
                  ? "bg-green-700 text-white"
                  : "bg-blue-800 text-blue-100"} shadow"
              >
                ${isPublic ? "PUBLIC" : "PRIVATE"}
              </span>
            </div>
          </div>

          <!-- Lobby Info -->
          <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 bg-black/60"
          >
            <div>
              <div class="text-lg md:text-xl font-bold text-yellow-100 mb-1">
                ${lobby.gameConfig.gameMap}
              </div>
              <div
                class="flex items-center gap-3 text-xs md:text-sm font-mono mb-1"
              >
                <span
                  class="inline-flex items-center px-2 py-1 rounded bg-yellow-800 text-yellow-200"
                >
                  ${lobby.gameConfig.gameMode === GameMode.Team
                    ? `${teamCount} Teams`
                    : translateText("game_mode.ffa")}
                </span>
                <span
                  class="inline-flex items-center px-2 py-1 rounded bg-yellow-950 text-yellow-400"
                >
                  ${translateText(
                    `map.${lobby.gameConfig.gameMap
                      .toLowerCase()
                      .replace(/\s+/g, "")}`,
                  )}
                </span>
              </div>
              <div class="flex gap-6 text-yellow-300 font-bold text-sm">
                <span
                  >👥 ${lobby.numClients} / ${lobby.gameConfig.maxPlayers}</span
                >
                ${isPublic ? html`<span>⏱ ${timeDisplay}</span>` : ""}
              </div>
            </div>
            <div>
              <button
                @click=${() => this.lobbyClicked(lobby)}
                ?disabled=${this.isButtonDebounced}
                class="mt-2 md:mt-0 px-6 py-2 rounded-lg font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg transition-all duration-100
                ${this.isButtonDebounced
                  ? "opacity-70 cursor-not-allowed"
                  : ""}"
              >
                ${translateText("public_lobby.join")}
              </button>
            </div>
          </div>
        </div>
      `;
    };

    return html`
      <div class="space-y-6">
        ${this.publicLobbies.length
          ? renderLobbyCard(this.publicLobbies[0], true)
          : ""}
        ${this.privateLobbies.map((l) => renderLobbyCard(l, false))}
      </div>
    `;
  }

  leaveLobby() {
    this.isLobbyHighlighted = false;
    this.currLobby = null;
  }

  private lobbyClicked(lobby: GameInfo) {
    if (this.isButtonDebounced) {
      return;
    }

    // Set debounce state
    this.isButtonDebounced = true;

    // Reset debounce after delay
    setTimeout(() => {
      this.isButtonDebounced = false;
    }, this.debounceDelay);

    if (this.currLobby === null) {
      this.isLobbyHighlighted = true;
      this.currLobby = lobby;
      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobby.gameID,
            clientID: generateID(),
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("leave-lobby", {
          detail: { lobby: this.currLobby },
          bubbles: true,
          composed: true,
        }),
      );
      this.leaveLobby();
    }
  }
}
