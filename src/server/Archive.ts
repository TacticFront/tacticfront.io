import { GameConfig, GameID, GameRecord, GameRecordSchema, Turn } from "../core/Schemas";
import { Storage } from '@google-cloud/storage';
import { BigQuery } from '@google-cloud/bigquery';

const storage = new Storage();
const bucket = storage.bucket("openfront-games");
const bigquery = new BigQuery();

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000; // Start with 1 second delay

export async function archive(gameRecord: GameRecord) {
    try {
        // First archive to BigQuery with retries
        await withRetry(
            () => archiveToBigQuery(gameRecord),
            'BigQuery archive',
            gameRecord.id
        );

        // Then archive to GCS with retries if there are turns
        if (gameRecord.turns.length > 0) {
            console.log(`${gameRecord.id}: game has more than zero turns, attempting to write to GCS`);
            await withRetry(
                () => archiveToGCS(gameRecord),
                'GCS archive',
                gameRecord.id
            );
        }
    } catch (error) {
        console.error(`${gameRecord.id}: Final archive error: ${error}`, {
            message: error?.message || error,
            stack: error?.stack,
            name: error?.name,
            ...(error && typeof error === 'object' ? error : {})
        });
        throw error;
    }
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    gameId: string,
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt < MAX_RETRIES) {
                const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                const jitter = Math.random() * 1000;
                const totalDelay = backoffDelay + jitter;

                console.log(`${gameId}: ${operationName} attempt ${attempt + 1} failed with ${error}. Retrying in ${Math.round(totalDelay)}ms...`);
                await delay(totalDelay);
            }
        }
    }

    console.error(`${gameId}: All ${MAX_RETRIES + 1} ${operationName} attempts failed. Last error:`, lastError);
    throw lastError;
}

async function archiveToBigQuery(gameRecord: GameRecord) {
    const row = {
        id: gameRecord.id,
        start: new Date(gameRecord.startTimestampMS),
        end: new Date(gameRecord.endTimestampMS),
        duration_seconds: gameRecord.durationSeconds,
        number_turns: gameRecord.num_turns,
        game_mode: gameRecord.gameConfig.gameType,
        winner: null,
        difficulty: gameRecord.gameConfig.difficulty,
        map: gameRecord.gameConfig.gameMap,
        players: gameRecord.players.map(p => ({
            username: p.username,
            ip: anonymizeIP(p.ip),
            persistentID: p.persistentID,
            clientID: p.clientID,
        })),
    };

    const [apiResponse] = await bigquery
        .dataset('game_archive')
        .table('game_results')
        .insert([row]);

    console.log(`${gameRecord.id}: wrote game metadata to BigQuery`);
    return apiResponse;
}

async function archiveToGCS(gameRecord: GameRecord) {
    // Create a deep copy to avoid modifying the original
    const recordCopy = JSON.parse(JSON.stringify(gameRecord));

    // Players may see this so make sure to clear PII
    recordCopy.players.forEach(p => {
        p.ip = "REDACTED";
        p.persistentID = "REDACTED";
    });

    const file = bucket.file(recordCopy.id);
    await file.save(JSON.stringify(GameRecordSchema.parse(recordCopy)), {
        contentType: 'application/json'
    });

    console.log(`${gameRecord.id}: game record successfully written to GCS`);
}



function anonymizeIP(ip: string): string {
    // IPv4 regex that validates octets are 0-255
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // More permissive IPv6 regex that handles compressed notation
    const ipv6Regex = /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    // For IPv4, keep first three octets, mask the last
    if (ipv4Regex.test(ip)) {
        const octets = ip.split('.');
        return `${octets[0]}.${octets[1]}.${octets[2]}.*`;
    }

    // For IPv6, normalize the address first (expand ::)
    if (ipv6Regex.test(ip)) {
        // Handle compressed notation
        const expandedIP = ip.includes('::')
            ? expandIPv6(ip)
            : ip;

        const segments = expandedIP.split(':');
        return `${segments.slice(0, 6).join(':')}:****:****`;
    }

    throw new Error('Invalid IP address format');
}

// Helper function to expand IPv6 compressed notation
function expandIPv6(ip: string): string {
    const parts = ip.split('::');
    const firstPart = parts[0] ? parts[0].split(':') : [];
    const secondPart = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - (firstPart.length + secondPart.length);
    const expanded = [...firstPart, ...Array(missing).fill('0000'), ...secondPart];
    return expanded.map(x => x.padStart(4, '0')).join(':');
}