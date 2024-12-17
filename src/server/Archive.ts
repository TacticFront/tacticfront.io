import { GameConfig, GameID, GameRecord, GameRecordSchema, Turn } from "../core/Schemas";
import { Storage } from '@google-cloud/storage';
import { BigQuery } from '@google-cloud/bigquery';
// import { anonymize } from 'ip-anonymize';
import anonymize from 'ip-anonymize';



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
                ip: anonymize(p.ip),
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