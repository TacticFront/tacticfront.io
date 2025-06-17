// src/client/LobbyAdPopup.ts

import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { consolex } from "../core/Consolex";
import { GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";

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
      this.lobbies = await this.fetchLobbies();
      this.lobbies.forEach((l) => {
        // Store the start time on first fetch because endpoint is cached, causing
        // the time to appear irregular.
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
        }

        if (l.numClients || 0 > 0) {
          this.showJoinModal = true;
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
      window.open(`/game?gameID=${lobby.gameID}`, "_blank");
    }
    this.showJoinModal = false;
  }

  private handleCloseModal() {
    this.showJoinModal = false;
  }

  render() {
    if (!this.showJoinModal || this.lobbies.length === 0) return html``;

    const lobby = this.lobbies[0];
    if (!lobby?.gameConfig) {
      return;
    }
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));

    // Format time to show minutes and seconds
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const teamCount =
      lobby.gameConfig.gameMode === GameMode.Team
        ? lobby.gameConfig.playerTeams || 0
        : null;

    return html`
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      >
        <div
          class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full text-center"
        >
          <h2 class="text-xl font-semibold mb-4">Join Public Lobby?</h2>
          <p class="mb-4">
            A public lobby is available. Would you like to join?
          </p>
          <p class="mb-4 text-sm text-gray-600">Game ID: ${lobby.gameID}</p>
          <div class="flex justify-center gap-4">
            <span
              class="text-sm ${this.isLobbyHighlighted
                ? "text-green-600"
                : "text-blue-600"} bg-white rounded-sm px-1"
            >
              ${lobby.gameConfig.gameMode === GameMode.Team
                ? translateText("public_lobby.teams", { num: teamCount ?? 0 })
                : translateText("game_mode.ffa")}</span
            >
            <span
              >${translateText(
                `map.${lobby.gameConfig.gameMap.toLowerCase().replace(/\s+/g, "")}`,
              )}</span
            >
            <button
              class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              @click=${this.handleJoinClick}
            >
              Yes
            </button>
            <button
              class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
              @click=${this.handleCloseModal}
            >
              No
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
