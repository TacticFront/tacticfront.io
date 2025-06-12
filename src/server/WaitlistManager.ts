import { EventEmitter } from "events";
import { GameType } from "../core/game/Game";
import { GameManager } from "./GameManager";

interface WaitlistEntry {
  clientId: string;
  token: string;
  ws: any; // WebSocket
}

export class WaitlistManager extends EventEmitter {
  private queue: WaitlistEntry[] = [];
  private gm: GameManager;
  private threshold: number;

  constructor(gm: GameManager, threshold: number = 2) {
    super();
    this.gm = gm;
    this.threshold = threshold;
  }

  join(entry: WaitlistEntry) {
    this.queue.push(entry);
    this.emit("queued", entry);
    if (this.queue.length >= this.threshold) {
      this.startMultiplayer();
    }
  }

  private startMultiplayer() {
    const entries = this.queue.splice(0, this.threshold);
    const gameId = `wait_${Date.now()}`;
    const config = {
      gameType: GameType.Public, // or custom
      maxPlayers: entries.length,
    };
    // Create a new game
    const game = this.gm.createGame(gameId, config as any);
    // Add each client to the game
    for (const { clientId, ws } of entries) {
      //this.gm.addClient(clientId, gameId, ws);
      ws.send(JSON.stringify({ type: "match_found", gameId }));
    }
    this.emit("started", gameId);
  }
}
