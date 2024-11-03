import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Layer } from './Layer';
import { Game, Player } from '../../../core/game/Game';
import { ClientID } from '../../../core/Schemas';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

interface Entry {
  name: string
  position: number
  score: string
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

    const sorted = this.game.players()
      .sort((a, b) => b.numTilesOwned() - a.numTilesOwned())

    this.players = sorted
      .slice(0, 5)
      .map((player, index) => ({
        name: player.displayName(),
        position: index + 1,
        score: formatPercentage(player.numTilesOwned() / this.game.numLandTiles()),
        isMyPlayer: player == myPlayer
      }));

    if (myPlayer != null && this.players.find(p => p.isMyPlayer) == null) {
      let place = 0
      for (const p of sorted) {
        place++
        if (p == myPlayer) {
          break
        }
      }

      this.players.pop()
      this.players.push({
        name: myPlayer.displayName(),
        position: place,
        score: formatPercentage(myPlayer.numTilesOwned() / this.game.numLandTiles()),
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
  img.emoji {
    height: 1em;  // Match text height
    width: auto;  // Maintain aspect ratio
  }
  .leaderboard {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 9999;
    background-color: rgba(30, 30, 30, 0.7); /* Added transparency */
    padding: 10px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    max-width: 300px;
    max-height: 80vh;
    overflow-y: auto;
    width: 300px;
    backdrop-filter: blur(5px); /* Optional: adds a blur effect to content behind the leaderboard */
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid rgba(51, 51, 51, 0.2); /* Made border slightly transparent */
    color: white;
  }
  th {
    background-color: rgba(44, 44, 44, 0.5); /* Made header slightly transparent */
    color: white;
  }
  .myPlayer {
    font-weight: bold;
    font-size: 1.5em;
  }
  .otherPlayer {
    font-size: 1.3em;
  }
  tr:nth-child(even) {
    background-color: rgba(44, 44, 44, 0.5); /* Made alternating rows slightly transparent */
  }
  tr:hover {
    background-color: rgba(58, 58, 58, 0.6); /* Made hover effect slightly transparent */
  }
  .hidden {
    display: none !important;
  }
  @media (max-width: 1000px) {
    .leaderboard {
      display: none !important;
    }
  }
`;

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
              <th>Owned</th>
            </tr>
          </thead>
          <tbody>
            ${this.players
        .map((player, index) => html`
                <tr class="${player.isMyPlayer ? 'myPlayer' : 'otherPlayer'}">
                  <td>${player.position}</td>
                  <td>${unsafeHTML(player.name)}</td>
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

function formatPercentage(value: number): string {
  const perc = value * 100
  if (perc > 99.5) {
    return "100%"
  }
  if (perc < .01) {
    return "0%"
  }
  if (perc < .1) {
    return (perc).toPrecision(1) + '%'
  }
  return perc.toPrecision(2) + '%';
}