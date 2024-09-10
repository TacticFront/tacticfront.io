import {Config, getConfig} from "../core/configuration/Config";
import {GameID, Lobby, ServerMessage, ServerMessageSchema} from "../core/Schemas";
import {loadTerrainMap, TerrainMap} from "../core/TerrainMapLoader";
import {ClientGame, createClientGame} from "./ClientGame";
import backgroundImage from '../../resources/images/TerrainMapFrontPage.png';
import favicon from '../../resources/images/Favicon.png';
import {v4 as uuidv4} from 'uuid';


import './styles.css';
import {simpleHash} from "../core/Util";
import {PseudoRandom} from "../core/PseudoRandom";


class Client {
    private terrainMap: Promise<TerrainMap>
    private game: ClientGame
    private lobbiesInterval: NodeJS.Timeout | null = null;
    private isLobbyHighlighted: boolean = false;

    private ip: Promise<string | null> = null

    private config: Config

    constructor() {
    }

    initialize(): void {
        this.config = getConfig()
        setFavicon()
        this.terrainMap = loadTerrainMap()
        this.startLobbyPolling()
        this.ip = getClientIP()
        setupUsernameCallback((username) => {
            console.log('Username updated:', username);
            if (this.game != null) {
                this.game.playerName = username
            }
        });
    }

    private startLobbyPolling(): void {
        this.fetchAndUpdateLobbies(); // Fetch immediately on start
        this.lobbiesInterval = setInterval(() => this.fetchAndUpdateLobbies(), 1000);
    }

    private async fetchAndUpdateLobbies(): Promise<void> {
        try {
            const lobbies = await this.fetchLobbies();
            this.updateLobbiesDisplay(lobbies);
        } catch (error) {
            console.error('Error fetching and updating lobbies:', error);
        }
    }

    private updateLobbiesDisplay(lobbies: Lobby[]): void {
        if (lobbies.length === 0) {
            document.getElementById('lobby-button').style.display = 'none';
            return;
        }

        const lobby = lobbies[0];
        const lobbyButton = document.getElementById('lobby-button');
        const nameElement = document.getElementById('lobby-name');
        const timerElement = document.getElementById('lobby-timer');
        const playerCountElement = document.getElementById('player-count');

        if (lobbyButton) {
            lobbyButton.style.display = 'flex';
            lobbyButton.onclick = () => this.joinLobby(lobby);

            // Preserve the highlighted state
            lobbyButton.classList.toggle('highlighted', this.isLobbyHighlighted);
        }

        if (nameElement) nameElement.textContent = `Game ${lobby.id.substring(0, 3)}`;
        if (timerElement) {
            const timeRemaining = Math.max(0, Math.floor((lobby.msUntilStart) / 1000));
            timerElement.textContent = `Starts in: ${timeRemaining}s`;
        }

        if (playerCountElement) playerCountElement.textContent = `Players: ${lobby.numClients + this.numFakeHumans(lobby)}`;

        if (lobbies.length > 1) {
            const nextLobby = lobbies[1]
            const nextGame = document.getElementById('next-game');
            nextGame.textContent = `Next Game: ${nextLobby.id.substring(0, 3)}`
        }
    }

    async fetchLobbies(): Promise<Lobby[]> {
        const url = '/lobbies';
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            }
            const data = await response.json();
            return data.lobbies;
        } catch (error) {
            console.error('Error fetching lobbies:', error);
            throw error;
        }
    }

    private async joinLobby(lobby: Lobby) {
        console.log(`joining lobby ${lobby.id}`)
        const lobbyButton = document.getElementById('lobby-button');
        if (lobbyButton) {
            this.isLobbyHighlighted = !this.isLobbyHighlighted;
            lobbyButton.classList.toggle('highlighted', this.isLobbyHighlighted);
        }
        if (!this.isLobbyHighlighted) {
            this.game.stop()
            this.game = null
            return
        }

        if (this.game != null) {
            return;
        }
        const [terrainMap, clientIP] = await Promise.all([
            this.terrainMap,
            this.ip
        ]);
        console.log(`got ip ${clientIP}`)
        this.game = createClientGame(
            getUsername(),
            uuidv4(),
            uuidv4(),
            clientIP,
            lobby.id,
            this.config,
            terrainMap
        );
        this.game.join();
        const g = this.game;
        window.addEventListener('beforeunload', function (event) {
            console.log('Browser is closing');
            g.stop();
        });
    }

    numFakeHumans(lobby: Lobby): number {
        const gameHash = simpleHash(lobby.id)
        const totalNumFakeHumans = this.config.numFakeHumans(lobby.id)
        const timeLeft = lobby.msUntilStart
        const rand = new PseudoRandom(gameHash)
        const startTimes: number[] = []
        const lobbyTime = this.config.lobbyLifetime() / this.config.gameCreationRate()
        for (let i = 0; i < totalNumFakeHumans; i++) {
            startTimes.push(rand.nextInt(0, lobbyTime))
        }

        startTimes.sort()

        let currNumFakeHumans = 0
        for (const joinTime of startTimes) {
            if (timeLeft < joinTime) {
                currNumFakeHumans++
            }
        }
        return currNumFakeHumans
    }
}

function getUsername(): string {
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    if (usernameInput) {
        const trimmedValue = usernameInput.value.trim();
        return trimmedValue || 'Anon'; // Return 'Anon' if the trimmed value is empty
    }
    return 'Anon'; // Return 'Anon' if the input element is not found
}

function setupUsernameCallback(callback: (username: string) => void): void {
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const username = getUsername();
            callback(username);
        });
    } else {
        console.error('Username input element not found');
    }
}

async function getClientIP(timeoutMs: number = 1000): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response: Response = await fetch('https://api.ipify.org?format=json', {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: {ip: string} = await response.json();
        return data.ip;
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                console.error('Request timed out');
            } else {
                console.error('Error fetching IP:', error.message);
            }
        } else {
            console.error('An unknown error occurred');
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Initialize the client when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Client().initialize();
});

document.body.style.backgroundImage = `url(${backgroundImage})`;

function setFavicon(): void {
    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = favicon;
    document.head.appendChild(link);
}