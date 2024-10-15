import {LitElement, html, css} from 'lit';
import {customElement, property, state, query} from 'lit/decorators.js';
import {GameMap} from '../core/game/Game';

@customElement('join-private-lobby-modal')
export class JoinPrivateLobbyModal extends LitElement {
  @state() private isModalOpen = false;
  @query('#lobbyIdInput') private lobbyIdInput!: HTMLInputElement;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .modal-content {
      background-color: white;
      margin: 15% auto;
      padding: 20px;
      border-radius: 8px;
      width: 80%;
      max-width: 500px;
      text-align: center;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover,
    .close:focus {
      color: black;
      text-decoration: none;
      cursor: pointer;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      transition: background-color 0.3s;
    }
    button:hover {
      background-color: #0056b3;
    }
    .lobby-id-container {
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 10px;
      margin: 20px 0;
    }
    .lobby-id-container input {
      flex-grow: 1;
      max-width: 200px;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .lobby-id-container button {
      padding: 10px 15px;
    }
    .join-button {
      margin-top: 10px;
    }
  `;

  render() {
    return html`
      <div class="modal-overlay" style="display: ${this.isModalOpen ? 'block' : 'none'}">
        <div class="modal-content">
          <span class="close" @click=${this.close}>&times;</span>
          <h2>Join Private Lobby</h2>
          <div class="lobby-id-container">
            <input type="text" id="lobbyIdInput" placeholder="Enter Lobby ID">
            <button @click=${this.pasteFromClipboard}>Paste</button>
          </div>
          <button class="join-button" @click=${this.joinLobby}>Join Lobby</button>
        </div>
      </div>
    `;
  }

  public open() {
    this.isModalOpen = true;
  }

  public close() {
    this.isModalOpen = false;
  }

  private async pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText();
      this.lobbyIdInput.value = clipText;
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  }

  private joinLobby() {
    const lobbyId = this.lobbyIdInput.value;
    // Add your logic here to join the lobby using the lobbyId
    console.log(`Joining lobby with ID: ${lobbyId}`);
    this.dispatchEvent(new CustomEvent('join-lobby', {
      detail: {
        lobby: {id: lobbyId},
        singlePlayer: false,
        map: GameMap.World,
      },
      bubbles: true,
      composed: true
    }))

    this.close();
  }
}