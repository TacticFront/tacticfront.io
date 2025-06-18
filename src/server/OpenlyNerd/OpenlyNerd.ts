// src/server/OpenlyNerd/OpenlyNerd.ts

// src/server/OpenlyNerd.ts

import { GameID, GameRecord } from "../../core/Schemas";
import { replacer } from "../../core/Util";
import { Client } from "../Client";

export async function sendWinInfotoOpenlyNerd(gameRecord: GameRecord) {
  const { turns, ...recordWithoutTurns } = gameRecord;

  const data = {
    type: "game_stats",
    gameRecord: JSON.stringify(recordWithoutTurns),
  };

  try {
    const response = await fetch("http://api.openlynerd.com/api/game/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data, replacer),
    });
    if (!response.ok) {
      console.error("Failed to POST client:", await response.text());
    }
  } catch (err) {
    console.error("Error posting client:", err);
  }
}

export async function sendPlayersToOpenlyNerd(clients: Client[], id: GameID) {
  const data = {
    type: "initial_players",
    gameID: id,
    players: [] as any[],
  };

  for (const client of clients) {
    // use 'of', not 'in'
    const player = {
      clientID: client.clientID,
      persistentID: client.persistentID,
      ip: client.ip,
      username: client.username,
      nerdToken: client.nerdToken,
      flag: client.flag,
    };
    data.players.push(player); // add player object to players array
  }

  try {
    const response = await fetch("http://api.openlynerd.com/api/game/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.error("Failed to POST clients:", await response.text());
    }
  } catch (err) {
    console.error("Error posting clients:", err);
  }
}
