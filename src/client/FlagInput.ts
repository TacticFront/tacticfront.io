// src/client/FlagInput.ts

import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import Countries from "./data/countries.json";
const flagKey: string = "flag";

@customElement("flag-input")
export class FlagInput extends LitElement {
  @state() private flag: string = "";
  @state() private search: string = "";
  @state() private showModal: boolean = false;

  static styles = css`
    @media (max-width: 768px) {
      .flag-modal {
        width: 80vw;
      }

      .dropdown-item {
        width: calc(100% / 3 - 15px);
      }
    }
  `;

  private handleSearch(e: Event) {
    this.search = String((e.target as HTMLInputElement).value);
  }

  private setFlag(flag: string) {
    if (flag === "xx") {
      flag = "";
    }
    this.flag = flag;
    this.showModal = false;
    this.storeFlag(flag);
  }

  public getCurrentFlag(): string {
    return this.flag;
  }

  private getStoredFlag(): string {
    const storedFlag = localStorage.getItem(flagKey);
    if (storedFlag) {
      return storedFlag;
    }
    return "";
  }

  private storeFlag(flag: string) {
    if (flag) {
      localStorage.setItem(flagKey, flag);
    } else if (flag === "") {
      localStorage.removeItem(flagKey);
    }
  }

  private dispatchFlagEvent() {
    this.dispatchEvent(
      new CustomEvent("flag-change", {
        detail: { flag: this.flag },
        bubbles: true,
        composed: true,
      }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this.flag = this.getStoredFlag();
    this.dispatchFlagEvent();
    window.addEventListener("close-all-modals", this.handleCloseAllModals);
  }

  disconnectedCallback() {
    window.removeEventListener("close-all-modals", this.handleCloseAllModals);
    super.disconnectedCallback();
  }

  private handleCloseAllModals = () => {
    if (this.showModal) {
      this.showModal = false;
      this.requestUpdate(); // ensure Lit rerenders
    }
  };

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <!-- Modal backdrop -->
      ${this.showModal
        ? html`
            <div
              class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              @click=${() => (this.showModal = false)}
            ></div>
          `
        : ""}

      <div class="flex relative z-10">
        <button
          @click=${() => (this.showModal = !this.showModal)}
          class="border p-[4px] rounded-lg flex cursor-pointer border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
          title="Pick a flag!"
        >
          <img class="size-[48px]" src="/flags/${this.flag || "xx"}.svg" />
        </button>
      </div>

      <!-- Centered Modal -->
      ${this.showModal
        ? html`
            <div
              class="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] max-w-[92vw] h-[500px] max-h-[90vh] bg-gray-900/90 backdrop-blur-md p-4 rounded-xl shadow-2xl flex flex-col gap-4"
              @click=${(e: Event) => e.stopPropagation()}
            >
              <input
                class="h-10 border-none text-center rounded-xl shadow-sm text-xl text-black dark:bg-gray-700 dark:text-white"
                type="text"
                placeholder="Search..."
                @change=${this.handleSearch}
                @keyup=${this.handleSearch}
              />
              <div
                class="flex flex-wrap justify-evenly gap-4 overflow-y-auto overflow-x-hidden"
              >
                ${Countries.filter(
                  (country) =>
                    country.name
                      .toLowerCase()
                      .includes(this.search.toLowerCase()) ||
                    country.code
                      .toLowerCase()
                      .includes(this.search.toLowerCase()),
                ).map(
                  (country) => html`
                    <button
                      @click=${() => this.setFlag(country.code)}
                      class="text-center cursor-pointer border-none bg-none opacity-80 w-[calc(25%-16px)] max-w-[100px]"
                    >
                      <img
                        class="country-flag w-full h-auto"
                        src="/flags/${country.code}.svg"
                      />
                      <span class="country-name">${country.name}</span>
                    </button>
                  `,
                )}
              </div>
            </div>
          `
        : ""}
    `;
  }
}
