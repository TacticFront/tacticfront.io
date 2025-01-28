import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Lobby } from "../core/Schemas";
import { Difficulty, GameMapType, GameType } from '../core/game/Game';
import { consolex } from '../core/Consolex';

@customElement('public-lobby')
export class PublicLobby extends LitElement {
    @state() private lobbies: Lobby[] = [];
    @state() private isLobbyHighlighted: boolean = false;
    private lobbiesInterval: number | null = null;
    private currLobby: Lobby = null;

    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        super.connectedCallback();
        this.fetchAndUpdateLobbies();
        this.lobbiesInterval = window.setInterval(() => this.fetchAndUpdateLobbies(), 1000);
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
            this.lobbies = lobbies;
        } catch (error) {
            consolex.error('Error fetching lobbies:', error);
        }
    }

    async fetchLobbies(): Promise<Lobby[]> {
        try {
            const response = await fetch('/lobbies');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.lobbies;
        } catch (error) {
            consolex.error('Error fetching lobbies:', error);
            throw error;
        }
    }

    render() {
        if (this.lobbies.length === 0) return html``;
        
        const lobby = this.lobbies[0];
        const timeRemaining = Math.max(0, Math.floor(lobby.msUntilStart / 1000));

        return html`
            <button
                @click=${() => this.lobbyClicked(lobby)}
                class="w-full mx-auto p-4 md:p-6 ${
                    this.isLobbyHighlighted
                        ? 'bg-gradient-to-r from-green-600 to-green-500'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500'
                } text-white font-medium rounded-xl transition-opacity duration-200 hover:opacity-90"
            >
                <div class="text-lg md:text-2xl font-semibold mb-2">Next Game</div>
                <div class="flex flex-col gap-1 md:gap-2 text-blue-100 text-sm md:text-base">
                    <div>Starts in: ${timeRemaining}s</div>
                    <div>Players: ${lobby.numClients}</div>
                    <div>ID: ${lobby.id}</div>
                </div>
            </button>
        `;
    }

    private lobbyClicked(lobby: Lobby) {
        this.isLobbyHighlighted = !this.isLobbyHighlighted;
        if (this.currLobby == null) {
            this.currLobby = lobby;
            this.dispatchEvent(new CustomEvent('join-lobby', {
                detail: {
                    lobby,
                    gameType: GameType.Public,
                    map: GameMapType.World,
                    difficulty: Difficulty.Medium,
                },
                bubbles: true,
                composed: true
            }));
        } else {
            this.dispatchEvent(new CustomEvent('leave-lobby', {
                detail: { lobby: this.currLobby },
                bubbles: true,
                composed: true
            }));
            this.currLobby = null;
        }
    }
}