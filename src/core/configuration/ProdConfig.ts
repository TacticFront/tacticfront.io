import { DefaultConfig } from "./DefaultConfig";

export const prodConfig = new class extends DefaultConfig {
    discordBotSecret(): string {
        throw new Error("Method not implemented.");
    }

}