import {Config, getConfig} from "../core/configuration/Config";
import {GameID, Lobby, ServerMessage, ServerMessageSchema} from "../core/Schemas";
import {loadTerrainMap, TerrainMap} from "../core/game/TerrainMapLoader";
import {ClientGame, createClientGame} from "./ClientGame";
import backgroundImage from '../../resources/images/TerrainMapFrontPage.png';
import favicon from '../../resources/images/Favicon.png';
import {v4 as uuidv4} from 'uuid';

import './PublicLobby';

import './styles.css';


const usernameKey: string = 'username';


class Client {


    private terrainMap: Promise<TerrainMap>
    private game: ClientGame

    private ip: Promise<string | null> = null

    private config: Config

    constructor() {
    }

    initialize(): void {
        const storedUsername = localStorage.getItem(usernameKey)
        if (storedUsername) {
            const usernameInput = document.getElementById('username') as HTMLInputElement | null;
            if (usernameInput) {
                usernameInput.value = storedUsername
            }
        }

        this.config = getConfig()
        setFavicon()
        this.terrainMap = loadTerrainMap()
        this.ip = getClientIP()
        document.addEventListener('join-lobby', this.handleJoinLobby.bind(this));
    }

    private async handleJoinLobby(event: CustomEvent) {
        const lobby = event.detail
        console.log(`joining lobby ${lobby.id}`)
        const [terrainMap, clientIP] = await Promise.all([
            this.terrainMap,
            this.ip
        ]);
        console.log(`got ip ${clientIP}`)
        this.game = createClientGame(
            refreshUsername,
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
}

function refreshUsername(): string {
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    if (usernameInput == null) {
        console.warn('username element not found')
        return "Anon"
    }
    if (usernameInput && usernameInput.value.trim()) {
        const trimmedValue = usernameInput.value.trim();
        localStorage.setItem(usernameKey, trimmedValue)
        return trimmedValue
    } else {
        const storedUsername = localStorage.getItem(usernameKey);
        if (storedUsername) {
            return storedUsername
        }
        const newUsername = "Anon" + uuidToThreeDigits()
        localStorage.setItem(usernameKey, newUsername)
        return newUsername
    }
}

function setupUsernameCallback(callback: (username: string) => void): void {
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const username = refreshUsername();
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

function uuidToThreeDigits(): string {
    const uuid = uuidv4()
    // Remove hyphens and convert to lowercase
    const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

    // Convert hex string to decimal
    const decimal = BigInt(`0x${cleanUuid}`);

    // Get last 3 digits
    const threeDigits = decimal % 1000n;

    // Pad with leading zeros if necessary
    return threeDigits.toString().padStart(3, '0');
}