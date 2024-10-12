import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';


@customElement('single-player-modal')
export class SinglePlayerModal extends LitElement {
  @state() private isModalOpen = false;

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
  text-align: center; /* Center the content inside the modal */
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
  background-color: #007bff; /* Changed to blue */
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s;
  display: inline-block; /* Ensures the button takes only necessary width */
  margin-top: 20px; /* Adds some space above the button */
}

button:hover {
  background-color: #0056b3; /* Darker blue for hover state */
}
  `;

  render() {
    return html`
      <div class="modal-overlay" style="display: ${this.isModalOpen ? 'block' : 'none'}">
        <div class="modal-content">
          <span class="close" @click=${this.close}>&times;</span>
          <h2>Start Single Player Game</h2>
          <button @click=${this.startGame}>Start Game</button>
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

  private startGame() {
    console.log('Starting single player game...');
    this.dispatchEvent(new CustomEvent('single-player', {
      detail: {todo: "TODO"},
      bubbles: true,
      composed: true
    }));
    this.close();
  }
}