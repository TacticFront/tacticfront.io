import { LitElement, html, css } from 'lit';
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

    static styles = css`
        .lobby-button {
            width: 100%;
            max-width: 25rem;
            margin: 0 auto;
            padding: 0.75rem;
            background: linear-gradient(to right, #2563eb, #3b82f6);
            color: white;
            font-weight: 500;
            border-radius: 0.5rem;
            transition: opacity 0.2s;
        }
        .lobby-button:hover {
            opacity: 0.9;
        }
        .lobby-button.highlighted {
            background: linear-gradient(to right, #16a34a, #22c55e);
        }
        .lobby-name {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .lobby-info {
            display: flex;
            justify-content: center;
            gap: 1rem;
            color: rgb(219 234 254);
            font-size: 0.875rem;
        }
    `;

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
                class="lobby-button ${this.isLobbyHighlighted ? 'highlighted' : ''}"
            >
                <div class="lobby-name">Next Public Game</div>
                <div class="lobby-info">
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