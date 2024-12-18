import { LogSeverity } from "../core/Schemas";

export function slog(eventType: string, description, data: any, severity = LogSeverity.Info): void {
    const logEntry = {
        eventType: eventType,
        description: description,
        severity: severity,
        data: data
    };
    if (process.env.GAME_ENV == 'dev') {
        if (severity != LogSeverity.Debug) {
            console.log(description)
        }
    } else {
        console.log(JSON.stringify(logEntry));
    }
}