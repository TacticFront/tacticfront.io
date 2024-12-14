import { GameRunner, joinLobby } from "./GameRunner";
import backgroundImage from '../../resources/images/TerrainMapFrontPage.png';
import favicon from '../../resources/images/Favicon.svg';

import './PublicLobby';
import './UsernameInput';
import './styles.css';
import { UsernameInput } from "./UsernameInput";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";




class Client {
    private gameStop: () => void

    private usernameInput: UsernameInput | null = null;

    private joinModal: JoinPrivateLobbyModal
    constructor() {
    }

    initialize(): void {
        this.usernameInput = document.querySelector('username-input') as UsernameInput;
        if (!this.usernameInput) {
            console.warn('Username input element not found');
        }
        window.addEventListener('beforeunload', (event) => {
            console.log('Browser is closing');
            if (this.gameStop != null) {
                this.gameStop()
            }
        });

        setFavicon()
        document.addEventListener('join-lobby', this.handleJoinLobby.bind(this));
        document.addEventListener('leave-lobby', this.handleLeaveLobby.bind(this));
        document.addEventListener('single-player', this.handleSinglePlayer.bind(this));


        const spModal = document.querySelector('single-player-modal') as SinglePlayerModal;
        spModal instanceof SinglePlayerModal
        document.getElementById('single-player').addEventListener('click', () => {
            spModal.open();
        })

        const hostModal = document.querySelector('host-lobby-modal') as HostPrivateLobbyModal;
        hostModal instanceof HostPrivateLobbyModal
        document.getElementById('host-lobby-button').addEventListener('click', () => {
            hostModal.open();
        })

        this.joinModal = document.querySelector('join-private-lobby-modal') as JoinPrivateLobbyModal;
        this.joinModal instanceof JoinPrivateLobbyModal
        document.getElementById('join-private-lobby-button').addEventListener('click', () => {
            this.joinModal.open();
        })
    }

    private async handleJoinLobby(event: CustomEvent) {
        const lobby = event.detail.lobby
        console.log(`joining lobby ${lobby.id}`)
        if (this.gameStop != null) {
            console.log('joining lobby, stopping existing game')
            this.gameStop()
        }
        this.gameStop = joinLobby(
            {
                gameType: event.detail.gameType,
                playerName: (): string => this.usernameInput.getCurrentUsername(),
                gameID: lobby.id,
                map: event.detail.map,
                difficulty: event.detail.difficulty,
            },
            () => this.joinModal.close()
        );
    }

    private async handleLeaveLobby(event: CustomEvent) {
        if (this.gameStop == null) {
            return
        }
        console.log('leaving lobby, cancelling game')
        this.gameStop()
        this.gameStop = null
    }

    private async handleSinglePlayer(event: CustomEvent) {
        alert('coming soon')
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