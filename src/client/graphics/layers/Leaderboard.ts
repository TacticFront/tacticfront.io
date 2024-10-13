import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {Layer} from './Layer';
import {Game, Player} from '../../../core/game/Game';
import {ClientID} from '../../../core/Schemas';

interface Entry {
  name: string
  position: number
  score: number
  isMyPlayer: boolean
}

@customElement('leader-board')
export class Leaderboard extends LitElement implements Layer {

  private game: Game
  public clientID: ClientID

  init(game: Game) {
    this.game = game
  }

  tick() {
    if (this._hidden && !this.game.inSpawnPhase()) {
      this.showLeaderboard()
      this.updateLeaderboard()
    }
    if (this._hidden) {
      return
    }

    if (this.game.ticks() % 10 == 0) {
      this.updateLeaderboard()
    }
  }

  private updateLeaderboard() {
    if (this.clientID == null) {
      return
    }
    const myPlayer = this.game.players().find(p => p.clientID() == this.clientID)
    if (myPlayer == null) {
      return
    }

    const sorted = this.game.players()
      .sort((a, b) => b.numTilesOwned() - a.numTilesOwned())

    this.players = sorted
      .slice(0, 5)
      .map((player, index) => ({
        name: player.name(),
        position: index + 1,
        score: player.numTilesOwned(),
        isMyPlayer: player == myPlayer
      }));

    if (this.players.find(p => p.isMyPlayer) == null) {
      let place = 0
      for (const p of sorted) {
        place++
        if (p == myPlayer) {
          break
        }
      }

      this.players.pop()
      this.players.push({
        name: myPlayer.name(),
        position: place,
        score: myPlayer.numTilesOwned(),
        isMyPlayer: true,
      })
    }


    this.requestUpdate()
  }

  renderLayer(context: CanvasRenderingContext2D) {
  }
  shouldTransform(): boolean {
    return false
  }

  static styles = css`
    :host {
      display: block;
    }
    .leaderboard {
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 9999;
      background-color: #1E1E1E;
      padding: 15px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      max-width: 300px;
      max-height: 80vh;
      overflow-y: auto;
      width: 300px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #333;
      color: white;
    }
    th {
      background-color: #2C2C2C;
      color: white;
    }
    .myPlayer {
      font-weight: bold;
      font-size: 1.2em;
    }
    tr:nth-child(even) {
      background-color: #2C2C2C;
    }
    tr:hover {
      background-color: #3A3A3A;
    }
    .hidden {
      display: none !important;
    }
  `;

  @property({type: Array})
  players: Entry[] = [];

  @state()
  private _hidden = true;

  render() {
    return html`
      <div class="leaderboard ${this._hidden ? 'hidden' : ''}">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${this.players
        .map((player, index) => html`
                <tr class="${player.isMyPlayer ? 'myPlayer' : 'none'}">
                  <td>${player.position}</td>
                  <td>${player.name.slice(0, 12)}</td>
                  <td>${player.score}</td>
                </tr>
              `)}
          </tbody>
        </table>
      </div>
    `;
  }

  hideLeaderboard() {
    this._hidden = true;
    this.requestUpdate();
  }

  showLeaderboard() {
    this._hidden = false;
    this.requestUpdate();
  }

  get isVisible() {
    return !this._hidden;
  }
}