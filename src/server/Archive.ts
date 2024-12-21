import { GameConfig, GameID, GameRecord, GameRecordSchema, Turn } from "../core/Schemas";
import { Storage } from '@google-cloud/storage';
import { BigQuery } from '@google-cloud/bigquery';



const storage = new Storage();
const bigquery = new BigQuery();

export async function archive(gameRecord: GameRecord) {
    try {
        // Save metadata to BigQuery
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
                // Masks last couple of bits from ip for
                // user privacy.
                ip: anonymizeIP(p.ip),
                persistentID: p.persistentID,
                clientID: p.clientID,
            })),
        };

        const [apiResponse] = await bigquery
            .dataset('game_archive')
            .table('game_results')
            .insert([row]);

        console.log(`wrote game metadata to BigQuery: ${gameRecord.id}`);

        if (gameRecord.turns.length > 0) {
            console.log(`${gameRecord.id}: game has more than zero turns, attempting to write to gcs`)
            // Players may see this so make sure to clear PII
            gameRecord.players.forEach(p => {
                p.ip = "REDACTED"
                p.persistentID = "REDACTED"
            });

            console.log(`writing game ${gameRecord.id} to gcs`);
            const bucket = storage.bucket("openfront-games");
            const file = bucket.file(gameRecord.id);
            await file.save(JSON.stringify(GameRecordSchema.parse(gameRecord)), {
                contentType: 'application/json'
            });
            console.log(`${gameRecord.id}: game record successfully writting to gcs`)
        }
    } catch (error) {
        try {
            console.error(`Error archiving game ${gameRecord.id}:`);

            if (Array.isArray(error?.errors)) {
                // Handle BigQuery insertion errors which come as an array
                error.errors.forEach((err, index) => {
                    console.error(`${gameRecord.id}: Archive Error ${index + 1}:`, {
                        reason: err.reason,
                        message: err.message,
                        location: err.location,
                        debugInfo: err.debugInfo
                    });
                });
            } else if (error?.code) {
                // Handle Google Cloud Storage errors which typically have error codes
                console.error(`${gameRecord.id}: Archive: Storage error:`, {
                    code: error.code,
                    message: error.message,
                    stack: error.stack,
                    details: error.errors
                });
            } else {
                // Handle generic errors
                console.error(`${gameRecord.id}: Archive: Unexpected error:`, {
                    message: error?.message || error,
                    stack: error?.stack,
                    name: error?.name,
                    ...(error && typeof error === 'object' ? error : {})
                });
            }
        } catch (error) {
            console.log(`error handling archive error: ${error}`)
        }
    }
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