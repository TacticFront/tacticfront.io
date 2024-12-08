import { GameConfig, GameID, GameRecord, GameRecordSchema, Turn } from "../core/Schemas";
import { Storage } from '@google-cloud/storage';

const storage = new Storage();

export async function archive(gameRecord: GameRecord) {
    console.log(`writing game ${gameRecord.id} to gcs`)
    const bucket = storage.bucket("openfront-games");
    const file = bucket.file(gameRecord.id);
    await file.save(JSON.stringify(GameRecordSchema.parse(gameRecord)), {
        contentType: 'application/json'
    });
}