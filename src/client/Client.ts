import {Config, getConfig} from "../core/configuration/Config";
import {GameID, Lobby, ServerMessage, ServerMessageSchema} from "../core/Schemas";
import {loadTerrainMap, TerrainMap} from "../core/game/TerrainMapLoader";
import {ClientGame, createClientGame} from "./ClientGame";
import backgroundImage from '../../resources/images/TerrainMapFrontPage.png';
import favicon from '../../resources/images/Favicon.png';
import {v4 as uuidv4} from 'uuid';

import './PublicLobby';
import './UsernameInput';


import './styles.css';
import {UsernameInput} from "./UsernameInput";
import {SinglePlayerModal} from "./SinglePlayerModal";


const usernameKey: string = 'username';


class Client {
    private terrainMap: Promise<TerrainMap>
    private game: ClientGame

    private ip: Promise<string | null> = null

    private config: Config

    private usernameInput: UsernameInput | null = null;


    constructor() {
    }

    initialize(): void {
        this.usernameInput = document.querySelector('username-input') as UsernameInput;
        if (!this.usernameInput) {
            console.warn('Username input element not found');
        }

        this.config = getConfig()
        setFavicon()
        this.terrainMap = loadTerrainMap()
        this.ip = getClientIP()
        document.addEventListener('join-lobby', this.handleJoinLobby.bind(this));
        document.addEventListener('leave-lobby', this.handleLeaveLobby.bind(this));
        document.addEventListener('single-player', this.handleSinglePlayer.bind(this));


        const singlePlayerButton = document.getElementById('single-player');
        const modal = document.querySelector('single-player-modal') as SinglePlayerModal;

        if (singlePlayerButton && modal instanceof SinglePlayerModal) {
            singlePlayerButton.addEventListener('click', () => {
                modal.open();
            });
        }

    }

    private async handleJoinLobby(event: CustomEvent) {
        const lobby = event.detail.lobby
        console.log(`joining lobby ${lobby.id}`)
        const [terrainMap, clientIP] = await Promise.all([
            this.terrainMap,
            this.ip
        ]);
        console.log(`got ip ${clientIP}`)
        if (this.game != null) {
            this.game.stop()
        }
        this.game = createClientGame(
            event.detail.singlePlayer,
            (): string => {return this.usernameInput.getCurrentUsername()},
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

    private async handleLeaveLobby(event: CustomEvent) {
        this.game.stop()
        this.game = null
    }

    private async handleSinglePlayer(event: CustomEvent) {
        alert('coming soon')
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