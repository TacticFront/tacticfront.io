// src/client/UsernameInput.ts

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { boolean } from "zod/v4";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import { UsernameSanitizer } from "../core/game/openlynerd/UsernameSanitizer";
import {
  MAX_USERNAME_LENGTH,
  validateUsername,
} from "../core/validations/username";

const usernameKey: string = "username";

@customElement("username-input")
export class UsernameInput extends LitElement {
  @state() private username: string = "";
  @property({ type: String }) validationError: string = "";
  @property({ type: boolean }) idiotDetected: string = "";

  private _isValid: boolean = true;
  private userSettings: UserSettings = new UserSettings();

  // Remove static styles since we're using Tailwind

  createRenderRoot() {
    // Disable shadow DOM to allow Tailwind classes to work
    return this;
  }

  public getCurrentUsername(): string {
    return this.username;
  }

  connectedCallback() {
    super.connectedCallback();

    this.storeAuthFromUrl();
    this.username = this.getStoredUsername();
    this.dispatchUsernameEvent();
  }

  // <div class="mb-3 text-lg font-bold tracking-wide">Quick Join</div>

  render() {
    const token = localStorage.getItem("nerd-token");

    return html`
      <div
        class="bg-white/30 dark:bg-black/40 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 w-full"
      >
        ${token
          ? html`
              <div class="flex flex-col items-center gap-3">
                <div
                  class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent/80 text-white border-2 border-accent shadow text-lg"
                >
                  <span class="font-mono text-2xl">${this.username}</span>
                </div>
                <button
                  @click=${this.logout}
                  class="w-full mt-2 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-lg font-bold shadow-md transition"
                >
                  Log Out
                </button>
              </div>
            `
          : html`
              <input
                id="username-input-field"
                type="text"
                .value=${this.username}
                @input=${this.handleChange}
                @change=${this.handleChange}
                placeholder="${translateText("username.enter_username")}"
                maxlength="${MAX_USERNAME_LENGTH}"
                autocomplete="off"
                class="w-full px-5 py-3 mb-2 border-2 border-white/40 rounded-xl shadow bg-white/60 dark:bg-black/40 text-xl text-gray-800 dark:text-gray-200 text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
              />
              ${this.validationError
                ? html`<div
                    class="w-full mb-2 px-3 py-2 rounded bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 border-2 border-red-400 dark:border-red-700 text-center font-semibold"
                  >
                    ${this.validationError}
                  </div>`
                : null}
              <button
                @click=${this.redirectToAuth}
                class="w-full py-3 px-6 mt-2 rounded-xl bg-accent text-white text-lg font-bold shadow-md hover:bg-accent/90 active:bg-accent/80 transition"
              >
                JOIN NOW
              </button>
              <div class="mt-3 text-xs text-accent text-center">
                or log in with
                <a
                  href="https://openlynerd.com/appauth?appid=tacticfront"
                  class="underline hover:text-accent/70 transition"
                  >OpenlyNerd.com</a
                >
              </div>
            `}
      </div>
    `;
  }

  private logout() {
    localStorage.removeItem("nerd-token");
    localStorage.removeItem("username");
    this.username = this.generateNewUsername(); // Optionally reset username to guest
    this.requestUpdate(); // Lit: forces rerender if needed
    window.location.reload(); // Optional: hard reload (if you want to fully reset app state)
  }

  private redirectToAuth() {
    const username = this.username;
    const url = `https://openlynerd.com/appauth?appid=tacticfront`;
    window.location.href = url;
  }

  public storeAuthFromUrl() {
    console.log("Storing auth from URL parameters");
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const username = urlParams.get("username");

    if (username) {
      this.storeUsername(username);
    }

    if (token) {
      localStorage.setItem("nerd-token", token);
    }

    // Optional: clean the URL
    if (token || username) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const result = validateUsername(this.username);
    this._isValid = result.isValid;

    if (this.username && UsernameSanitizer.isProfane(this.username)) {
      this.username = UsernameSanitizer.sanitize(this.username); // Reset to a new username if profane
      setTimeout(() => {
        this.validationError =
          "Your username contains inappropriate or prohibited language."; // or null, or "" depending on your codebase
      }, 2000);
    }

    if (result.isValid) {
      this.storeUsername(this.username);
      this.validationError = "";
    } else {
      this.validationError = result.error ?? "";
    }
  }

  private getStoredUsername(): string {
    const storedUsername = localStorage.getItem(usernameKey);
    if (storedUsername) {
      return storedUsername;
    }
    return this.generateNewUsername();
  }

  private storeUsername(username: string) {
    if (username) {
      localStorage.setItem(usernameKey, username);
    }
  }

  private dispatchUsernameEvent() {
    this.dispatchEvent(
      new CustomEvent("username-change", {
        detail: { username: this.username },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private generateNewUsername(): string {
    const newUsername = "Anon" + this.uuidToThreeDigits();
    this.storeUsername(newUsername);
    return newUsername;
  }

  private uuidToThreeDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const threeDigits = decimal % 1000n;
    return threeDigits.toString().padStart(3, "0");
  }

  public isValid(): boolean {
    return this._isValid;
  }
}
