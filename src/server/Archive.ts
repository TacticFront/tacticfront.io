// src/server/Archive.ts

import { S3 } from "@aws-sdk/client-s3";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { AnalyticsRecord, GameID, GameRecord } from "../core/Schemas";
import { replacer } from "../core/Util";
import { logger } from "./Logger";
import { sendWinInfotoOpenlyNerd } from "./OpenlyNerd/OpenlyNerd";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const config = getServerConfigFromServer();

const log = logger.child({ component: "Archive" });

// R2 client configuration
const r2 = new S3({
  region: "auto", // R2 ignores region, but it's required by the SDK
  endpoint: config.r2Endpoint(),
  credentials: {
    accessKeyId: config.r2AccessKey(),
    secretAccessKey: config.r2SecretKey(),
  },
  forcePathStyle: true,
  maxAttempts: 5, // initial try + 4 retries
  retryMode: "standard", // or "adaptive"
});

const bucket = config.r2Bucket();
const gameFolder = "games";
const analyticsFolder = "analytics";

export async function archive(gameRecord: GameRecord) {
  try {
    sendWinInfotoOpenlyNerd(gameRecord);

    gameRecord.gitCommit = config.gitCommit();
    // Archive to R2
    await archiveAnalyticsToR2(gameRecord);

    log.info(`${gameRecord.info.gameID}: game has:` + gameRecord.turns?.length);

    // Archive full game if there are turns
    if (gameRecord.turns.length > 0) {
      log.info(
        `${gameRecord.info.gameID}: game has more than zero turns, attempting to write to full game to R2`,
      );
      await archiveFullGameToR2(gameRecord);
    }
  } catch (error) {
    log.error(`${gameRecord.info.gameID}: Final archive error: ${error}`, {
      message: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      ...(error && typeof error === "object" ? error : {}),
    });
  }
}

async function archiveAnalyticsToR2(gameRecord: GameRecord) {
  // Create analytics data object
  const { info, version, gitCommit } = gameRecord;
  const analyticsData: AnalyticsRecord = {
    info,
    version,
    gitCommit,
  };

  try {
    // Store analytics data using just the game ID as the key
    const analyticsKey = `${info.gameID}.json`;

    const putResponse = await r2.putObject({
      Bucket: bucket,
      Key: `${analyticsFolder}/${analyticsKey}`,
      Body: JSON.stringify(analyticsData, replacer),
      ContentType: "application/json",
    });

    log.info(`${info.gameID}: wrote analytics to R2`, {
      key: analyticsKey,
      etag: putResponse.ETag,
      requestId: putResponse.$metadata?.requestId,
      attempts: putResponse.$metadata?.attempts,
      httpStatus: putResponse.$metadata?.httpStatusCode,
    });

    //log.info(`${info.gameID}: successfully wrote game analytics to R2`);
  } catch (error) {
    log.error(`${info.gameID}: Error writing game analytics to R2: ${error}`, {
      message: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      ...(error && typeof error === "object" ? error : {}),
    });
    throw error;
  }
}

async function archiveFullGameToR2(gameRecord: GameRecord) {
  // Create a deep copy to avoid modifying the original
  const recordCopy = structuredClone(gameRecord);

  // Players may see this so make sure to clear PII
  recordCopy.info.players.forEach((p) => {
    p.persistentID = "REDACTED";
  });

  try {
    const putResponse = await r2.putObject({
      Bucket: bucket,
      Key: `${gameFolder}/${recordCopy.info.gameID}.json`,
      Body: JSON.stringify(recordCopy, replacer),
      ContentType: "application/json",
    });

    log.info(`${recordCopy.info.gameID}: wrote analytics to R2`, {
      key: `${gameFolder}/${recordCopy.info.gameID}.json`,
      etag: putResponse.ETag,
      requestId: putResponse.$metadata?.requestId,
      attempts: putResponse.$metadata?.attempts,
      httpStatus: putResponse.$metadata?.httpStatusCode,
    });
  } catch (error) {
    log.error(`error saving game ${gameRecord.info.gameID}`);
    throw error;
  }

  log.info(`${gameRecord.info.gameID}: game record successfully written to R2`);
}

export async function readGameRecord(
  gameId: GameID,
): Promise<GameRecord | null> {
  try {
    // Check if file exists and download in one operation
    const response = await r2.getObject({
      Bucket: bucket,
      Key: `${gameFolder}/${gameId}.json`, // Fixed - needed to include gameFolder
    });
    // Parse the response body
    if (response.Body === undefined) return null;
    const bodyContents = await response.Body.transformToString();
    return JSON.parse(bodyContents) as GameRecord;
  } catch (error) {
    // Log the error for monitoring purposes
    log.error(`${gameId}: Error reading game record from R2: ${error}`, {
      message: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      ...(error && typeof error === "object" ? error : {}),
    });

    // Return null instead of throwing the error
    return null;
  }
}

export async function gameRecordExists(gameId: GameID): Promise<boolean> {
  try {
    await r2.headObject({
      Bucket: bucket,
      Key: `${gameFolder}/${gameId}.json`, // Fixed - needed to include gameFolder
    });
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      return false;
    }
    log.error(`${gameId}: Error checking archive existence: ${error}`, {
      message: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      ...(error && typeof error === "object" ? error : {}),
    });
    return false;
  }
}
