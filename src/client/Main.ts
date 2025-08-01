// src/client/Main.ts

import { decodeJwt } from "jose";
import page from "page";
import favicon from "../../resources/images/Favicon.svg";
import { consolex } from "../core/Consolex";
import { GameRecord, GameStartInfo } from "../core/Schemas";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { GameType } from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import { joinLobby } from "./ClientGameRunner";
import "./DarkModeButton";
import { DarkModeButton } from "./DarkModeButton";
import "./FlagInput";
import { FlagInput } from "./FlagInput";
import { GameStartingModal } from "./GameStartingModal";
import "./GoogleAdElement";
import GoogleAdElement from "./GoogleAdElement";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import "./LangSelector";
import { LangSelector } from "./LangSelector";
import { LanguageModal } from "./LanguageModal";
import "./LobbyAdPopup";
import { LobbyAdPopup } from "./LobbyAdPopup";
import { MapVoteModal } from "./MapVoteModal";
import "./PublicLobby";
import { PublicLobby } from "./PublicLobby";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { UsernameInput } from "./UsernameInput";
import { generateCryptoRandomUUID } from "./Utils";
import "./components/NewsButton";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { isLoggedIn } from "./jwt";
import "./styles.css";

export interface JoinLobbyEvent {
  clientID: string;
  // Multiplayer games only have gameID, gameConfig is not known until game starts.
  gameID: string;
  // GameConfig only exists when playing a singleplayer game.
  gameStartInfo?: GameStartInfo;
  // GameRecord exists when replaying an archived game.
  gameRecord?: GameRecord;
}

class Client {
  private gameStop: (() => void) | null = null;

  private usernameInput: UsernameInput | null = null;
  private flagInput: FlagInput | null = null;
  private darkModeButton: DarkModeButton | null = null;

  private joinModal: JoinPrivateLobbyModal;
  private publicLobby: PublicLobby;
  private lobbyAd: LobbyAdPopup;
  private googleAds: NodeListOf<GoogleAdElement>;
  private userSettings: UserSettings = new UserSettings();

  constructor() {}

  initialize(): void {
    const publicLobby = document.querySelector("public-lobby") as PublicLobby;

    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const lobbyType = target.dataset?.tab ?? "public";
        console.log(lobbyType);
        publicLobby.updateLobbyType(lobbyType);
      });
    });

    // const newsModal = document.querySelector("news-modal") as NewsModal;
    // if (!newsModal) {
    //   consolex.warn("News modal element not found");
    // } else {
    //   consolex.log("News modal element found");
    // }
    // newsModal instanceof NewsModal;
    // const newsButton = document.querySelector("news-button") as NewsButton;
    // if (!newsButton) {
    //   consolex.warn("News button element not found");
    // } else {
    //   consolex.log("News button element found");
    // }

    // Comment out to show news button.
    // newsButton.hidden = true;

    const langSelector = document.querySelector(
      "lang-selector",
    ) as LangSelector;
    const LanguageModal = document.querySelector(
      "lang-selector",
    ) as LanguageModal;
    if (!langSelector) {
      consolex.warn("Lang selector element not found");
    }
    if (!LanguageModal) {
      consolex.warn("Language modal element not found");
    }

    this.flagInput = document.querySelector("flag-input") as FlagInput;
    if (!this.flagInput) {
      consolex.warn("Flag input element not found");
    }

    this.darkModeButton = document.querySelector(
      "dark-mode-button",
    ) as DarkModeButton;
    if (!this.darkModeButton) {
      consolex.warn("Dark mode button element not found");
    }

    this.usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!this.usernameInput) {
      consolex.warn("Username input element not found");
    }

    this.publicLobby = document.querySelector("public-lobby") as PublicLobby;
    this.lobbyAd = document.querySelector("lobby-ad") as LobbyAdPopup;
    this.googleAds = document.querySelectorAll(
      "google-ad",
    ) as NodeListOf<GoogleAdElement>;

    window.addEventListener("beforeunload", () => {
      consolex.log("Browser is closing");
      if (this.gameStop !== null) {
        this.gameStop();
      }
    });

    setFavicon();
    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));

    const spModal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal;
    spModal instanceof SinglePlayerModal;
    const singlePlayerButtons = [
      document.getElementById("single-player-sidebar"),
      document.getElementById("single-player-mobile"),
    ];
    if (singlePlayerButtons === null) throw new Error("Missing single-player");
    singlePlayerButtons.forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => {
          if (this.usernameInput?.isValid()) {
            spModal.open();
          }
        });
      }
    });

    // const ctModal = document.querySelector("chat-modal") as ChatModal;
    // ctModal instanceof ChatModal;
    // document.getElementById("chat-button").addEventListener("click", () => {
    //   ctModal.open();
    // });

    const hlpModal = document.querySelector("help-modal") as HelpModal;
    hlpModal instanceof HelpModal;
    const helpButtons = [
      document.getElementById("help-button-sidebar"),
      document.getElementById("help-button-mobile"),
    ];
    if (helpButtons === null) throw new Error("Missing help-button");
    helpButtons.forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => {
          hlpModal.open();
        });
      }
    });

    const hasNerdToken = !!localStorage.getItem("nerd-token");

    const token = localStorage.getItem("nerd-token");

    if (token) {
      try {
        const payload = decodeJwt(token);
        const username = payload.username; // or payload.sub, etc.
        console.log("Decoded username:", username);
      } catch (e) {
        console.error("Invalid token:", e);
      }
    }

    if (hasNerdToken) {
      // loginDiscordButton.hidden = true;
      // logoutDiscordButton.hidden = true;
    } else {
      // if (isLoggedIn() === false || !hasNerdToken) {
      //   // Not logged in
      //   loginDiscordButton.disable = false;
      //   loginDiscordButton.translationKey = "main.login_discord";
      //   loginDiscordButton.hidden = false;
      //   loginDiscordButton.addEventListener("click", discordLogin);
      //   logoutDiscordButton.hidden = true;
      // } else {
      //   // JWT appears to be valid and nerd-token is set
      //   loginDiscordButton.disable = true;
      //   loginDiscordButton.translationKey = "main.checking_login";
      //   loginDiscordButton.hidden = true;
      //   logoutDiscordButton.hidden = true;
      //   // Look up the discord user object.
      //   // TODO: Add caching
      //   getUserMe().then((userMeResponse) => {
      //     if (userMeResponse === false) {
      //       // Not logged in
      //       loginDiscordButton.disable = false;
      //       loginDiscordButton.hidden = false;
      //       loginDiscordButton.translationKey = "main.login_discord";
      //       loginDiscordButton.addEventListener("click", discordLogin);
      //       logoutDiscordButton.hidden = true;
      //       return;
      //     }
      //     // TODO: Update the page for logged in user
      //     loginDiscordButton.translationKey = "main.logged_in";
      //     const { user, player } = userMeResponse;
      //   });
      //   // Add logout handler even though hidden (optional safety)
      //   logoutDiscordButton.addEventListener("click", () => {
      //     logOut();
      //     loginDiscordButton.disable = false;
      //     loginDiscordButton.hidden = false;
      //     loginDiscordButton.translationKey = "main.login_discord";
      //     loginDiscordButton.addEventListener("click", discordLogin);
      //     logoutDiscordButton.hidden = true;
      //   });
      // }
    }

    const settingsModal = document.querySelector(
      "user-setting",
    ) as UserSettingModal;
    settingsModal instanceof UserSettingModal;
    document
      .getElementById("settings-button")
      ?.addEventListener("click", () => {
        settingsModal.open();
      });

    const hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    hostModal instanceof HostPrivateLobbyModal;
    const hostLobbyButtons = [
      document.getElementById("host-lobby-button-public"),
      document.getElementById("host-lobby-button-private"),
    ];
    hostLobbyButtons.forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => {
          if (this.usernameInput?.isValid()) {
            hostModal.open();
            this.publicLobby.leaveLobby();
          }
        });
      }
    });

    const mapVoteModal = document.querySelector(
      "map-vote-modal",
    ) as MapVoteModal;
    mapVoteModal instanceof MapVoteModal;
    const mapVoteButton = document.getElementById("map-vote-button");
    if (mapVoteButton === null) throw new Error("Missing map-vote-button");
    mapVoteButton.addEventListener("click", () => {
      if (this.usernameInput?.isValid()) {
        mapVoteModal.open();
        this.publicLobby.leaveLobby();
      }
    });

    this.joinModal = document.querySelector(
      "join-private-lobby-modal",
    ) as JoinPrivateLobbyModal;
    this.joinModal instanceof JoinPrivateLobbyModal;
    const joinPrivateLobbyButtons = [
      document.getElementById("join-private-lobby-button-public"),
      document.getElementById("join-private-lobby-button-private"),
    ];
    if (joinPrivateLobbyButtons === null)
      throw new Error("Missing join-private-lobby-button");
    joinPrivateLobbyButtons.forEach((btn) => {
      if (btn) {
        btn.addEventListener("click", () => {
          if (this.usernameInput?.isValid()) {
            this.joinModal.open();
          }
        });
      }
    });

    if (this.userSettings.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    page("/join/:lobbyId", (ctx) => {
      if (ctx.init && sessionStorage.getItem("inLobby")) {
        // On page reload, go back home
        page("/");
        return;
      }
      const lobbyId = ctx.params.lobbyId;

      if (lobbyId?.endsWith("#")) {
        // When the cookies button is pressed, '#' is added to the url
        // causing the page to attempt to rejoin the lobby during game play.
        console.error("Invalid lobby ID provided");
        return;
      }

      this.joinModal.open(lobbyId);

      consolex.log(`joining lobby ${lobbyId}`);
    });

    page();
    function updateSliderProgress(slider) {
      const percent =
        ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty("--progress", `${percent}%`);
    }

    document
      .querySelectorAll("#bots-count, #private-lobby-bots-count")
      .forEach((slider) => {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      });
  }

  private async handleJoinLobby(event: CustomEvent) {
    const lobby = event.detail as JoinLobbyEvent;
    consolex.log(`joining lobby ${lobby.gameID}`);
    if (this.gameStop !== null) {
      consolex.log("joining lobby, stopping existing game");
      this.gameStop();
    }
    const config = await getServerConfigFromClient();

    this.gameStop = joinLobby(
      {
        gameID: lobby.gameID,
        serverConfig: config,
        flag:
          this.flagInput === null || this.flagInput.getCurrentFlag() === "xx"
            ? ""
            : this.flagInput.getCurrentFlag(),
        playerName: this.usernameInput?.getCurrentUsername() ?? "",
        token: getPlayToken(),
        clientID: lobby.clientID,
        gameStartInfo: lobby.gameStartInfo ?? lobby.gameRecord?.info,
        gameRecord: lobby.gameRecord,
      },
      () => {
        console.log("Closing modals");
        document.getElementById("settings-button")?.classList.add("hidden");
        document.getElementById("flag-input-div")?.classList.add("hidden");
        document.getElementById("lobbies")?.classList.add("hidden");
        document.getElementById("profile")?.classList.add("really-hidden");
        document.getElementById("left-menu")?.classList.add("really-hidden");
        document
          .getElementById("mobile-login-panel")
          ?.classList.add("really-hidden");
        document
          .getElementById("mobile-menu-button")
          ?.classList.add("really-hidden");
        document.getElementById("mobileNav")?.classList.add("really-hidden");
        document.getElementById("footer")?.classList.add("really-hidden");

        [
          "single-player-modal",
          "host-lobby-modal",
          "join-private-lobby-modal",
          "game-starting-modal",
          "top-bar",
          "help-modal",
          "user-setting",
        ].forEach((tag) => {
          const modal = document.querySelector(tag) as HTMLElement & {
            close?: () => void;
            isModalOpen?: boolean;
          };
          if (modal && typeof modal.close === "function") {
            modal.close();
          } else if (modal && "isModalOpen" in modal) {
            modal.isModalOpen = false;
          } else if (!modal) {
            consolex.warn("Modal tag not found:", tag);
          } else {
            consolex.warn(
              "Modal found, but no close() or isModalOpen property:",
              tag,
            );
          }
        });
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // show when the game loads
        const startingModal = document.querySelector(
          "game-starting-modal",
        ) as GameStartingModal;
        startingModal instanceof GameStartingModal;
        startingModal.show();
      },
      () => {
        this.joinModal.close();
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        if (event.detail.gameConfig?.gameType !== GameType.Singleplayer) {
          window.history.pushState({}, "", `/join/${lobby.gameID}`);
          sessionStorage.setItem("inLobby", "true");
        }
      },
    );
  }

  private async handleLeaveLobby(/* event: CustomEvent */) {
    if (this.gameStop === null) {
      return;
    }
    consolex.log("leaving lobby, cancelling game");
    this.gameStop();
    this.gameStop = null;
    this.publicLobby.leaveLobby();
    document.getElementById("flag-input-div")?.classList.remove("hidden");
  }
}

// Initialize the client when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Client().initialize();
});

function setFavicon(): void {
  const link = document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = favicon;
  document.head.appendChild(link);
}

// WARNING: DO NOT EXPOSE THIS ID
function getPlayToken(): string {
  const result = isLoggedIn();
  if (result !== false) return result.token;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentID(): string {
  const result = isLoggedIn();
  if (result !== false) return result.claims.sub;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromCookie(): string {
  const COOKIE_NAME = "player_persistent_id";

  // Try to get existing cookie
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
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
