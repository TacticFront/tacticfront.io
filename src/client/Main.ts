import { ClientGameRunner, joinLobby } from "./ClientGameRunner";
import backgroundImage from "../../resources/images/EuropeBackground.svg";
import favicon from "../../resources/images/Favicon.svg";

import "./PublicLobby";
import "./UsernameInput";
import "./styles.css";
import { UsernameInput } from "./UsernameInput";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import { generateID } from "../core/Util";
import { generateCryptoRandomUUID } from "./Utils";
import { consolex } from "../core/Consolex";

class Client {
  private gameStop: () => void;

  private usernameInput: UsernameInput | null = null;

  private joinModal: JoinPrivateLobbyModal;
  constructor() {}

  initialize(): void {
    this.usernameInput = document.querySelector(
      "username-input"
    ) as UsernameInput;
    if (!this.usernameInput) {
      consolex.warn("Username input element not found");
    }
    window.addEventListener("beforeunload", (event) => {
      consolex.log("Browser is closing");
      if (this.gameStop != null) {
        this.gameStop();
      }
    });

    setFavicon();
    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    document.addEventListener(
      "single-player",
      this.handleSinglePlayer.bind(this)
    );

    const spModal = document.querySelector(
      "single-player-modal"
    ) as SinglePlayerModal;
    spModal instanceof SinglePlayerModal;
    document.getElementById("single-player").addEventListener("click", () => {
      if (this.usernameInput.isValid()) {
        spModal.open();
      }
    });

    const hostModal = document.querySelector(
      "host-lobby-modal"
    ) as HostPrivateLobbyModal;
    hostModal instanceof HostPrivateLobbyModal;
    document
      .getElementById("host-lobby-button")
      .addEventListener("click", () => {
        if (this.usernameInput.isValid()) {
          hostModal.open();
        }
      });

    this.joinModal = document.querySelector(
      "join-private-lobby-modal"
    ) as JoinPrivateLobbyModal;
    this.joinModal instanceof JoinPrivateLobbyModal;
    document
      .getElementById("join-private-lobby-button")
      .addEventListener("click", () => {
        if (this.usernameInput.isValid()) {
          this.joinModal.open();
        }
      });
  }

  private async handleJoinLobby(event: CustomEvent) {
    const lobby = event.detail.lobby;
    consolex.log(`joining lobby ${lobby.id}`);
    if (this.gameStop != null) {
      consolex.log("joining lobby, stopping existing game");
      this.gameStop();
    }
    this.gameStop = joinLobby(
      {
        gameType: event.detail.gameType,
        playerName: (): string => this.usernameInput.getCurrentUsername(),
        gameID: lobby.id,
        persistentID: getPersistentIDFromCookie(),
        playerID: generateID(),
        clientID: generateID(),
        map: event.detail.map,
        difficulty: event.detail.difficulty,
        disableBots: event.detail.disableBots,
        disableNPCs: event.detail.disableNPCs,
      },
      () => this.joinModal.close()
    );
  }

  private async handleLeaveLobby(event: CustomEvent) {
    if (this.gameStop == null) {
      return;
    }
    consolex.log("leaving lobby, cancelling game");
    this.gameStop();
    this.gameStop = null;
  }

  private async handleSinglePlayer(event: CustomEvent) {
    alert("coming soon");
  }
}

// Initialize the client when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Client().initialize();
});

document.body.style.backgroundImage = `url(${backgroundImage})`;

function setFavicon(): void {
  const link = document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = favicon;
  document.head.appendChild(link);
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentIDFromCookie(): string {
  const COOKIE_NAME = "player_persistent_id";

  // Try to get existing cookie
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=").map((c) => c.trim());
    if (cookieName === COOKIE_NAME) {
      return cookieValue;
    }
  }

  // If no cookie exists, create new ID and set cookie
  const newID = generateCryptoRandomUUID();
  document.cookie = [
    `${COOKIE_NAME}=${newID}`,
    `max-age=${5 * 365 * 24 * 60 * 60}`, // 5 years
    "path=/",
    "SameSite=Strict",
    "Secure",
  ].join(";");

  return newID;
}
