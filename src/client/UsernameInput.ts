// src/client/UsernameInput.ts

import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  validateUsername,
} from "../core/validations/username";

const usernameKey: string = "username";

@customElement("username-input")
export class UsernameInput extends LitElement {
  @state() private username: string = "";
  @property({ type: String }) validationError: string = "";
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

  render() {
    const token = localStorage.getItem("nerd-token");

    if (token) {
      // User is logged in — display the username
      return html`
        <div class="text-center mt-2">
          <div
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-800 text-white border border-blue-400 shadow"
          >
            <span class="font-semibold">Player:</span>
            <span class="font-mono text-lg">${this.username}</span>
          </div>
        </div>
      `;
    }

    // User is not logged in — show input and login button
    return html`
      <input
        type="text"
        .value=${this.username}
        @input=${this.handleChange}
        @change=${this.handleChange}
        placeholder="${translateText("username.enter_username")}"
        maxlength="${MAX_USERNAME_LENGTH}"
        class="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-300/60 dark:bg-gray-700 dark:text-white"
      />
      ${this.validationError
        ? html`<div
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-red-600 border-red-600 dark:bg-gray-700 dark:text-red-300 dark:border-red-300"
          >
            ${this.validationError}
          </div>`
        : null}

      <button
        @click=${this.redirectToAuth}
        class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-xl text-xl hover:bg-blue-700 transition"
      >
        Log In
      </button>
    `;
  }

  private redirectToAuth() {
    const username = this.username;
    const url = `http://localhost:4200/appauth`;
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
