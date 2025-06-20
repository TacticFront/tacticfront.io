// src/server/GameManager.ts

import { Logger } from "winston";
import { ServerConfig } from "../core/configuration/Config";
import {
  Difficulty,
  Game,
  GameMapType,
  GameMode,
  GameType,
} from "../core/game/Game";
import { GameConfig, GameID } from "../core/Schemas";
import { Client } from "./Client";
import { GamePhase, GameServer } from "./GameServer";
import { sendPlayersToOpenlyNerd } from "./OpenlyNerd/OpenlyNerd";

export class GameManager {
  private games: Map<GameID, GameServer> = new Map();

  constructor(
    private config: ServerConfig,
    private log: Logger,
  ) {
    setInterval(() => this.tick(), 1000);
  }

  public game(id: GameID): GameServer | null {
    return this.games.get(id) ?? null;
  }

  addClient(client: Client, gameID: GameID, lastTurn: number): boolean {
    const game = this.games.get(gameID);
    if (game) {
      game.addClient(client, lastTurn);

      return true;
    }
    return false;
  }

  createGame(
    id: GameID,
    gameConfig: GameConfig | undefined,
    gameInstance: Game,
  ) {
    // Add gameInstance parameter
    const game = new GameServer(
      id,
      this.log,
      Date.now(),
      this.config,
      {
        gameMap: GameMapType.World,
        gameType: GameType.Private,
        difficulty: Difficulty.Medium,
        disableNPCs: false,
        infiniteGold: false,
        infiniteTroops: false,
        instantBuild: false,
        gameMode: GameMode.FFA,
        bots: 400,
        disabledUnits: [],
        ...gameConfig,
      },
      gameInstance,
    ); // Pass gameInstance to GameServer constructor
    this.games.set(id, game);
    return game;
  }

  activeGames(): number {
    return this.games.size;
  }

  gameIDs(): string[] {
    const ids: string[] = [];
    for (const id of this.games.keys()) {
      ids.push(id);
    }
    return ids;
  }

  activeClients(): number {
    let totalClients = 0;
    this.games.forEach((game: GameServer) => {
      totalClients += game.activeClients.length;
    });
    return totalClients;
  }

  tick() {
    const active = new Map<GameID, GameServer>();
    for (const [id, game] of this.games) {
      const phase = game.phase();
      if (phase === GamePhase.Active) {
        if (!game.hasStarted()) {
          if (game.activeClients.length) {
            sendPlayersToOpenlyNerd(game.activeClients, id); // This POSTs client info to your API
          }

          // Prestart tells clients to start loading the game.
          game.prestart();
          // Start game on delay to allow time for clients to connect.
          setTimeout(() => {
            try {
              game.start();
            } catch (error) {
              this.log.error(`error starting game ${id}: ${error}`);
            }
          }, 2000);
        }
      }

      if (phase === GamePhase.Finished) {
        try {
          game.end();
        } catch (error) {
          this.log.error(`error ending game ${id}: ${error}`);
        }
      } else {
        active.set(id, game);
      }
    }
    this.games = active;
  }
}
