// src/server/Master.ts

import cluster from "cluster";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameMapType } from "../core/game/Game";
import { GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { gatekeeper, LimiterType } from "./Gatekeeper";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";

const config = getServerConfigFromServer();
const playlist = new MapPlaylist();
const readyWorkers = new Set();

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());

app.use((req, res, next) => {
  if (!path.extname(req.path)) {
    const filePath = path.join(__dirname, "../../static", req.path + ".html");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  next();
});

app.use(
  express.static(path.join(__dirname, "../../static"), {
    maxAge: "1y", // Set max-age to 1 year for all static assets
    setHeaders: (res, path) => {
      // You can conditionally set different cache times based on file types
      if (path.endsWith(".html")) {
        // Set HTML files to no-cache to ensure Express doesn't send 304s
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        // Prevent conditional requests
        res.setHeader("ETag", "");
      } else if (path.match(/\.(js|css|svg)$/)) {
        // JS, CSS, SVG get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (path.match(/\.(bin|dat|exe|dll|so|dylib)$/)) {
        // Binary files also get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      // Other file types use the default maxAge setting
    },
  }),
);
app.use(express.json());

app.set("trust proxy", 3);
app.use(
  rateLimit({
    windowMs: 1000, // 1 second
    max: 20, // 20 requests per IP per second
  }),
);

const publicLobbiesJsonStr = "";
let lobbiesJsonStr = "";

const publicLobbyIDs: Set<string> = new Set();
const privateLobbyIDs: Set<string> = new Set();

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${config.numWorkers()} workers...`);

  // Fork workers
  for (let i = 0; i < config.numWorkers(); i++) {
    const worker = cluster.fork({
      WORKER_ID: i,
    });

    log.info(`Started worker ${i} (PID: ${worker.process.pid})`);
  }

  cluster.on("message", (worker, message) => {
    if (message.type === "GAME_CREATED") {
      if (message.lobbyType === "public") {
        publicLobbyIDs.add(message.gameID);
      } else {
        privateLobbyIDs.add(message.gameID);
      }
      return;
    }

    if (message.type === "WORKER_READY") {
      const workerId = message.workerId;
      readyWorkers.add(workerId);
      log.info(
        `Worker ${workerId} is ready. (${readyWorkers.size}/${config.numWorkers()} ready)`,
      );
      // Start scheduling when all workers are ready
      if (readyWorkers.size === config.numWorkers()) {
        log.info("All workers ready, starting game scheduling");

        const scheduleLobbies = () => {
          schedulePublicGame(playlist).catch((error) => {
            log.error("Error scheduling public game:", error);
          });
        };

        setInterval(
          () =>
            fetchLobbies().then((lobbies) => {
              if (lobbies === 0) {
                scheduleLobbies();
              }
            }),
          100,
        );
      }
    }
  });

  // Handle worker crashes
  cluster.on("exit", (worker, code, signal) => {
    const workerId = (worker as any).process?.env?.WORKER_ID;
    if (!workerId) {
      log.error(`worker crashed could not find id`);
      return;
    }

    log.warn(
      `Worker ${workerId} (PID: ${worker.process.pid}) died with code: ${code} and signal: ${signal}`,
    );
    log.info(`Restarting worker ${workerId}...`);

    // Restart the worker with the same ID
    const newWorker = cluster.fork({
      WORKER_ID: workerId,
    });

    log.info(
      `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
    );
  });

  const PORT = 3000;
  server.listen(PORT, () => {
    log.info(`Master HTTP server listening on port ${PORT}`);
  });
}

app.get(
  "/api/env",
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    const envConfig = {
      game_env: process.env.GAME_ENV || "prod",
    };
    res.json(envConfig);
  }),
);

// Add lobbies endpoint to list public games for this worker
app.get(
  "/api/public_lobbies",
  gatekeeper.httpHandler(LimiterType.Get, async (req, res) => {
    res.send(lobbiesJsonStr);
  }),
);

app.post(
  "/api/kick_player/:gameID/:clientID",
  gatekeeper.httpHandler(LimiterType.Post, async (req, res) => {
    if (req.headers[config.adminHeader()] !== config.adminToken()) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { gameID, clientID } = req.params;

    try {
      const response = await fetch(
        `http://localhost:${config.workerPort(gameID)}/api/kick_player/${gameID}/${clientID}`,
        {
          method: "POST",
          headers: {
            [config.adminHeader()]: config.adminToken(),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to kick player: ${response.statusText}`);
      }

      res.status(200).send("Player kicked successfully");
    } catch (error) {
      log.error(`Error kicking player from game ${gameID}:`, error);
      res.status(500).send("Failed to kick player");
    }
  }),
);

app.get("/api/worker_status", async (req, res) => {
  const statuses: any[] = [];
  for (let i = 0; i <= config.numWorkers(); i++) {
    try {
      const resp = await fetch(
        `http://localhost:${config.workerPortByIndex(i)}/api/worker_status`,
      );
      const json = await resp.json();
      statuses.push(json);
    } catch (err) {
      statuses.push({ workerId: i, error: (err as Error).message });
    }
  }
  res.json({ workers: statuses });
});

let activeStatsCache;
let activeStatsCacheTime = 0;

app.get("/api/active_stats", async (req, res) => {
  const now = Date.now();
  // Serve from cache if it's fresh (30s)
  if (activeStatsCache && now - activeStatsCacheTime < 30000) {
    return res.json(activeStatsCache);
  }

  try {
    const resp = await fetch("https://tacticfront.io/api/worker_status");
    const data = await resp.json();

    let totalGames = 0;
    let totalClients = 0;
    let errorWorkers = 0;
    const allGameIDs: string[] = [];

    for (const w of data.workers) {
      if (w.status === "ok") {
        totalGames += w.activeGames || 0;
        totalClients += w.activeClients || 0;
        if (Array.isArray(w.gameIDs)) allGameIDs.push(...w.gameIDs);
      } else {
        errorWorkers++;
      }
    }

    const result = {
      activeGames: totalGames,
      activeClients: totalClients,
      gameIDs: allGameIDs,
      errorWorkers,
      cachedAt: new Date().toISOString(),
    };

    // Cache it
    activeStatsCache = result;
    activeStatsCacheTime = now;

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err && err.message) || String(err) });
  }
});

async function fetchLobbies(): Promise<number> {
  const allLobbyIDs = new Set([...publicLobbyIDs, ...privateLobbyIDs]);
  const fetchPromises: Promise<GameInfo | null>[] = [];

  for (const gameID of allLobbyIDs) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5 sec timeout
    const port = config.workerPort(gameID);
    const promise = fetch(`http://localhost:${port}/api/game/${gameID}`, {
      headers: { [config.adminHeader()]: config.adminToken() },
      signal: controller.signal,
    })
      .then((resp) => resp.json())
      .then((json) => json as GameInfo)
      .catch((error) => {
        log.error(`Error fetching game ${gameID}:`, error);
        publicLobbyIDs.delete(gameID);
        privateLobbyIDs.delete(gameID);
        return null;
      });

    fetchPromises.push(promise);
  }

  // Wait for all results
  const results = await Promise.all(fetchPromises);

  // Filter valid lobbies, add lobbyType, and handle msUntilStart
  const lobbyInfos = results
    .filter((result) => result !== null)
    .map((gi: GameInfo) => {
      const isPublic = publicLobbyIDs.has(gi.gameID);
      const lobbyInfo: any = {
        gameID: gi.gameID,
        numClients: gi?.clients?.length ?? 0,
        gameConfig: gi.gameConfig,
        lobbyType: isPublic ? "public" : "private",
      };
      if ("msUntilStart" in gi) {
        lobbyInfo.msUntilStart = (gi.msUntilStart ?? Date.now()) - Date.now();
      }
      return lobbyInfo;
    });

  // Remove expired or full lobbies from both sets
  lobbyInfos.forEach((l) => {
    if (
      l.lobbyType === "public" &&
      "msUntilStart" in l &&
      l.msUntilStart !== undefined &&
      l.msUntilStart <= 250
    ) {
      publicLobbyIDs.delete(l.gameID);
      return;
    }
    if (
      l.lobbyType === "private" &&
      "msUntilStart" in l &&
      l.msUntilStart !== undefined &&
      l.msUntilStart <= 250
    ) {
      privateLobbyIDs.delete(l.gameID);
      return;
    }

    if (l.lobbyType === "private" && l.numClients === 0) {
      privateLobbyIDs.delete(l.gameID);
      return;
    }

    if (
      l.gameConfig &&
      l.gameConfig.maxPlayers !== undefined &&
      l.numClients !== undefined &&
      l.gameConfig.maxPlayers <= l.numClients
    ) {
      publicLobbyIDs.delete(l.gameID);
      privateLobbyIDs.delete(l.gameID);
      return;
    }
  });

  const publicCount = lobbyInfos.filter((l) => l.lobbyType === "public").length;

  // Update the JSON string with all lobbies
  lobbiesJsonStr = JSON.stringify({
    lobbies: lobbyInfos,
  });

  return publicCount;
}

// Map votes: mapName -> Set of IPs who voted
const mapVotes: Record<string, Set<string>> = {};
// IP -> map string
const ipToMapVote: Record<string, string> = {};

app.get("/api/map_votes", (req, res) => {
  const voteCounts = Object.fromEntries(
    Object.entries(mapVotes).map(([map, ips]) => [map, ips.size]),
  );
  res.json(voteCounts);
});

app.post("/api/vote_map", (req, res) => {
  const map = req.body.map;
  if (!map || typeof map !== "string") {
    return res.status(400).json({ error: "Missing or invalid map name" });
  }

  // Get client IP (handles proxy setups)
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress;

  if (!ip) {
    return res.status(400).json({ error: "Cannot determine client IP" });
  }

  // If their previous vote is for a map that has since had votes cleared, wipe their mapping.
  const prevMap = ipToMapVote[ip];
  if (prevMap && (!mapVotes[prevMap] || !mapVotes[prevMap].has(ip))) {
    delete ipToMapVote[ip];
  }

  // Now check: are they voting for the same map again?
  if (ipToMapVote[ip] === map && mapVotes[map]?.has(ip)) {
    return res
      .status(200)
      .json({ success: false, message: "Already voted for this map" });
  }

  // Remove previous vote from old map if it exists
  if (ipToMapVote[ip] && mapVotes[ipToMapVote[ip]]) {
    mapVotes[ipToMapVote[ip]].delete(ip);
  }

  // Initialize vote set for this map if needed
  if (!mapVotes[map]) {
    mapVotes[map] = new Set();
  }

  // Register their vote
  mapVotes[map].add(ip);
  ipToMapVote[ip] = map;

  res.json({ success: true, votes: mapVotes[map].size });
});

function getMostVotedMap(): string | null {
  let maxVotes = 0;
  let selected: string | null = null;
  for (const [map, ips] of Object.entries(mapVotes)) {
    if (ips.size > maxVotes) {
      if (!(map in GameMapType)) {
        mapVotes[map]?.clear?.();
        continue;
      }
      maxVotes = ips.size;
      selected = map;
    }
  }
  return selected;
}

// Function to schedule a new public game
async function schedulePublicGame(playlist: MapPlaylist) {
  const gameID = generateID();
  publicLobbyIDs.add(gameID);

  const workerPath = config.workerPath(gameID);
  const gameConfig = playlist.gameConfig();

  const votedMap = getMostVotedMap();
  log.error(`Next Map": ${votedMap}`);
  if (votedMap && votedMap in GameMapType) {
    gameConfig.gameMap = GameMapType[votedMap];
    // Optionally: reset votes for next round
    mapVotes[votedMap]?.clear?.();
    log.info(`Public game scheduled with voted map: ${votedMap}`);
  } else {
    log.info(`Public game scheduled with playlist map: ${gameConfig.gameMap}`);
  }

  // Send request to the worker to start the game
  try {
    const response = await fetch(
      `http://localhost:${config.workerPort(gameID)}/api/create_game/${gameID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [config.adminHeader()]: config.adminToken(),
        },
        body: JSON.stringify(gameConfig),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to schedule public game: ${response.statusText}`);
    }

    const data = await response.json();
  } catch (error) {
    log.error(`Failed to schedule public game on worker ${workerPath}:`, error);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SPA fallback route
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "../../static/index.html"));
});
