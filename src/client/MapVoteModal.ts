// src/client/MapVoteModal.ts

import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { GameMapType } from "../core/game/Game"; // Adjust import path as needed

@customElement("map-vote-modal")
export class MapVoteModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };
  @state() private voteCounts: Record<string, number> = {};
  @state() private submitting: boolean = false;
  @state() private error: string = "";
  @state() private selectedMap: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  static styles = css`
    .modal {
      /* Simple styles for overlay/modal */
    }
    .map-list {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .map-card {
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #ccc;
      min-width: 120px;
      text-align: center;
      background: #1a1a1a;
      color: #eee;
      transition: box-shadow 0.15s;
    }
    .map-card.selected,
    .map-card:hover {
      box-shadow: 0 0 0 2px #6bf;
    }
    .votes {
      font-size: 12px;
      color: #6bf;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadVotes();
  }

  async loadVotes() {
    try {
      const resp = await fetch("/api/map_votes");
      this.voteCounts = await resp.json();
    } catch (e) {
      this.error = "Could not fetch votes.";
    }
  }

  async vote(map: string) {
    this.submitting = true;
    this.selectedMap = map;
    try {
      const resp = await fetch("/api/vote_map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map }),
      });
      if (!resp.ok) throw new Error("Vote failed");
      await this.loadVotes();
    } catch (e) {
      this.error = "Failed to submit vote.";
    }
    this.submitting = false;
  }

  public open() {
    this.modalEl?.open();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.pollMapVotes(), 2000); // every 2s
  }

  public close() {
    this.modalEl?.close();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  pollMapVotes() {
    this.loadVotes();
  }

  createRenderRoot() {
    // This makes styles leak to the light DOM, but keeps your modal styling consistent with HostLobbyModal.
    return this;
  }

  render() {
    const maps = Object.keys(GameMapType).filter((k) => isNaN(Number(k)));

    return html`
      <o-modal title="Vote for a Map">
        <div class="option-title" style="text-align:center;margin-bottom:8px;">
          Select a map to vote
        </div>
        <div
          class="option-cards flex-row flex-wrap justify-center gap-4"
          style="display: flex; flex-wrap: wrap; gap: 16px;"
        >
          ${maps.map(
            (mapKey) => html`
              <div style="cursor:pointer;" @click=${() => this.vote(mapKey)}>
                <map-display
                  .mapKey=${mapKey}
                  .selected=${this.selectedMap === mapKey}
                  .translation=${(window as any).translateText
                    ? (window as any).translateText(
                        `map.${mapKey.toLowerCase()}`,
                      )
                    : GameMapType[mapKey]}
                ></map-display>
                <div
                  class="votes"
                  style="text-align:center;font-size:13px;color:#6bf;margin-top:4px;"
                >
                  ${this.voteCounts[mapKey] || 0}
                  vote${(this.voteCounts[mapKey] ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
            `,
          )}
        </div>
        ${this.error ? html`<div class="error">${this.error}</div>` : ""}
      </o-modal>
    `;
  }
}

export default MapVoteModal;
