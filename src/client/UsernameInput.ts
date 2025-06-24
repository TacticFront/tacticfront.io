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
      <div class="bg-yellow-900/5 rounded-xl p-6 shadow-lg w-full">
        ${token
          ? html`
              <div class="flex flex-col items-center gap-3">
                <div
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-800 text-white border border-blue-400 shadow"
                >
                  <span class="font-semibold">Player:</span>
                  <span class="font-mono text-lg">${this.username}</span>
                </div>
                <button
                  @click=${this.logout}
                  class="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-xl text-lg hover:bg-red-700 transition font-semibold"
                >
                  Log Out
                </button>
              </div>
            `
          : html`
              <input
                type="text"
                .value=${this.username}
                @input=${this.handleChange}
                @change=${this.handleChange}
                placeholder="${translateText("username.enter_username")}"
                maxlength="${MAX_USERNAME_LENGTH}"
                class="w-full mb-3 px-4 py-2 border border-yellow-700 rounded-xl shadow text-xl text-yellow-200 bg-black/40 text-center focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
              />
              ${this.validationError
                ? html`<div
                    class="w-full mb-2 px-3 py-1 text-md border rounded bg-white text-red-600 border-red-600 dark:bg-gray-700 dark:text-red-300 dark:border-red-300 text-center"
                  >
                    ${this.validationError}
                  </div>`
                : null}
              <button
                @click=${this.redirectToAuth}
                class="w-full bg-yellow-400 hover:bg-yellow-300 text-black py-2 rounded font-bold shadow text-lg mt-2 transition"
              >
                JOIN NOW
              </button>
              <div class="mt-3 text-xs text-yellow-600 text-center">
                or log in with
                <a
                  href="https://openlynerd.com/appauth?appid=tacticfront"
                  class="underline hover:text-yellow-400"
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
