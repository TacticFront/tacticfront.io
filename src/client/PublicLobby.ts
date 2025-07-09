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
  @state() selectedLobbyType: string = "public";

  static get properties() {
    return {
      selectedLobbyType: { type: String, reflect: true },
    };
  }

  firstUpdated() {
    const tabButtons = this.shadowRoot?.querySelectorAll(".tab-button") ?? [];
    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const lobbyType = target.dataset?.tab ?? "public";
        this.updateLobbyType(lobbyType);
        this.requestUpdate();
      });
    });
  }

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

  public updateLobbyType(lobbyType: string) {
    this.selectedLobbyType = lobbyType;

    console.log(lobbyType, this.selectedLobbyType);
    this.fetchAndUpdateLobbies();
    this.requestUpdate();
  }

  private async fetchAndUpdateLobbies(): Promise<void> {
    try {
      const lobbies = await this.fetchLobbies();

      let filteredLobbies: GameInfo[] = [];
      if (this.selectedLobbyType === "public") {
        filteredLobbies = lobbies.filter((l) => l.lobbyType === "public");
      } else if (this.selectedLobbyType === "private") {
        filteredLobbies = lobbies.filter((l) => l.lobbyType === "private");
      }

      // Assign new arrays directly, no need to clear first!
      this.publicLobbies = filteredLobbies.filter(
        (l) => l.lobbyType === "public",
      );
      this.privateLobbies = filteredLobbies.filter(
        (l) => l.lobbyType === "private",
      );

      filteredLobbies.forEach((l) => {
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
      if (!response.ok) {
        consolex.error(`HTTP error! status: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return data.lobbies;
    } catch (error) {
      consolex.error("Error fetching lobbies:", error);
      return [];
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
    const lobbiesToRender = this.getLobbiesToRender();
    if (lobbiesToRender.length === 0) {
      return this.renderEmptyState();
    }
    return html`
      <div class="space-y-8 px-2">
        ${lobbiesToRender.map((l) => this.renderLobbyCard(l))}
      </div>
    `;
  }

  private renderEmptyState() {
    return html`
      <div
        class="flex justify-center items-center py-20 text-xl text-gray-500 dark:text-gray-300 opacity-70 select-none"
      >
        ${this.selectedLobbyType === "public"
          ? "No public lobbies found."
          : "No private lobbies found."}
      </div>
    `;
  }

  private renderLobbyCard(lobby: GameInfo) {
    const isPublic = lobby.lobbyType === "public";
    if (!lobby?.gameConfig) return;
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    const teamCount =
      lobby.gameConfig.gameMode === GameMode.Team
        ? lobby.gameConfig.playerTeams || 0
        : null;
    const accentBG = "bg-accent bg-cyan-500";
    const accentText = "text-accent text-cyan-700";
    const accentRing = "ring-accent ring-cyan-400";

    return html`
      <div
        class="flex flex-col bg-white/30 dark:bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 mb-8 overflow-hidden relative group transition hover:scale-[1.025] duration-200 max-w-2xl mx-auto"
      >
        <!-- Map image background -->
        <div class="relative h-44 md:h-60 overflow-hidden">
          <img
            src="${getMapsImage(lobby.gameConfig.gameMap)}"
            alt="${lobby.gameConfig.gameMap}"
            class="object-cover w-full h-full brightness-90 group-hover:brightness-100 transition"
          />
          <div class="absolute top-3 left-3 flex gap-2">
            <span
              class="px-4 py-1 text-sm rounded-full font-semibold shadow-xl uppercase tracking-wide ${isPublic
                ? accentBG + " text-white"
                : "bg-gray-800 text-gray-100"}"
            >
              ${isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        <!-- Lobby Info -->
        <div
          class="flex flex-col md:flex-row md:items-center justify-between gap-3 px-7 py-5 bg-white/40 dark:bg-black/60 backdrop-blur-lg"
        >
          <div class="flex-1 min-w-0">
            <div class="text-2xl font-bold mb-1 ${accentText}">
              ${lobby.gameConfig.gameMap}
            </div>
            <div
              class="flex flex-wrap items-center gap-2 text-xs md:text-sm mb-2"
            >
              <span
                class="inline-flex items-center px-2 py-1 rounded-lg bg-white/80 dark:bg-black/50 font-bold ${accentText} border border-white/40"
              >
                ${lobby.gameConfig.gameMode === GameMode.Team
                  ? `${teamCount} Teams`
                  : translateText("game_mode.ffa")}
              </span>
              <span
                class="inline-flex items-center px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 border border-white/30 text-gray-700 dark:text-gray-200"
              >
                ${translateText(
                  `map.${lobby.gameConfig.gameMap
                    .toLowerCase()
                    .replace(/\s+/g, "")}`,
                )}
              </span>
            </div>
            <div
              class="flex gap-5 text-gray-800 dark:text-gray-100 font-semibold text-base"
            >
              <span
                >👥 ${lobby.numClients} / ${lobby.gameConfig.maxPlayers}</span
              >
              ${isPublic ? html`<span>⏱ ${timeDisplay}</span>` : ""}
            </div>
          </div>
          <div class="flex items-center mt-3 md:mt-0">
            <button
              @click=${() => this.lobbyClicked(lobby)}
              ?disabled=${this.isButtonDebounced}
              class="tf-button block font-bold text-lg ring-2 transition-all duration-100
                ${accentRing}
                ${this.isButtonDebounced
                ? "active opacity-60 cursor-not-allowed ring-cyan-300"
                : "hover:bg-cyan-400 hover:scale-105 ring-cyan-400"}"
              style="text-align: center;"
            >
              ${this.isButtonDebounced
                ? html`<span
                    class="inline-flex items-center justify-center w-full"
                  >
                    <svg
                      class="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      ></path>
                    </svg>
                    Joining...
                  </span>`
                : translateText("public_lobby.join")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private getLobbiesToRender(): GameInfo[] {
    if (this.selectedLobbyType === "public") {
      return this.publicLobbies;
    } else if (this.selectedLobbyType === "private") {
      return this.privateLobbies;
    }
    return [];
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
