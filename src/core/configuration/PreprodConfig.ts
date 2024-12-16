import { DefaultConfig } from "./DefaultConfig";

export const preprodConfig = new class extends DefaultConfig {
    discordBotSecret(): string {
        throw new Error("Method not implemented.");
    }

}