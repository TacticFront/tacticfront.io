import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import Countries from "./data/countries.json";
import { UserSettings } from "../core/game/UserSettings";

const flagKey: string = "flag";

@customElement("flag-input")
export class FlagInput extends LitElement {
  @state() private flag: string = "";
  @state() private search: string = "";
  @state() private showModal: boolean = false;
  private userSettings: UserSettings = new UserSettings();

  static styles = css`
    .dark-mode .flag-button {
      background: rgba(55, 65, 81, 0.7);
    }

    .flag-modal {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: absolute;
      top: 60px;
      left: 0;
      width: 560px;
      height: 500px;
      max-height: 50vh;
      background-color: rgb(35 35 35 / 0.8);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      padding: 10px;
      border-radius: 8px;
      z-index: 3;
    }

    .flag-search {
      height: 2rem;
      border-radius: 8px;
      border: none;
      text-align: center;
      font-size: 1.3rem;
    }

    .dark-mode .flag-search {
      background: rgb(55, 65, 81);
      color: white;
      border: 1px solid rgb(209, 213, 219);
    }

    .flag-dropdown {
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-evenly;
      gap: 1rem;
    }

    .dropdown-item {
      opacity: 0.7;
      width: calc(100% / 4 - 15px);
      text-align: center;
      color: white;
      cursor: pointer;
      border: none;
      background: none;
    }

    .dropdown-item:hover {
      opacity: 1;
    }

    .country-flag {
      width: 100%;
      height: auto;
    }

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
    if (flag == "") {
      this.flag = "";
    } else {
      this.flag = flag;
    }
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
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="flex relative">
        <button
          @click=${() => (this.showModal = !this.showModal)}
          class="border p-[4px] rounded-lg flex cursor-pointer border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
          title="Pick a flag!"
        >
          <img class="size-[48px]" src="/flags/${this.flag || "xx"}.svg" />
        </button>
        ${this.showModal
          ? html`
              <div
                class="text-white flex flex-col gap-[0.5rem] absolute top-[60px] left-[0px] w-[780%] h-[500px] max-h-[50vh] bg-gray-900/80 backdrop-blur-md p-[10px] rounded-[8px] z-[3] ${this
                  .showModal
                  ? ""
                  : "hidden"}"
              >
                <input
                  class="h-[2rem] border-none text-center border border-gray-300 rounded-xl shadow-sm text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-300/60 dark:bg-gray-700 dark:text-white"
                  type="text"
                  placeholder="Search..."
                  @change=${this.handleSearch}
                  @keyup=${this.handleSearch}
                />
                <div
                  class="flex flex-wrap justify-evenly gap-[1rem] overflow-y-auto overflow-x-hidden"
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
                        class="text-center cursor-pointer border-none bg-none opacity-70 sm:w-[calc(33.3333%-15px) w-[calc(100%/4-15px)]"
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
      </div>
    `;
  }
}
