// src/server/OpenlyNerd.ts

import { GameRecord } from "../core/Schemas";

export async function sendWinInfotoOpenlyNerd(gameRecord: GameRecord) {
  const data = {
    type: "game_stats",
    gameRecord: JSON.stringify(gameRecord),
  };

  try {
    const response = await fetch("http://api.openlynerd.com/api/game/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.error("Failed to POST client:", await response.text());
    }
  } catch (err) {
    console.error("Error posting client:", err);
  }
}
