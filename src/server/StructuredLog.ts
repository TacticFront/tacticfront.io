import { ClientID, GameID, LogSeverity } from "../core/Schemas";

export interface slogMsg {
  logKey: string;
  msg: string;
  data?: any;
  severity?: LogSeverity;
  gameID?: GameID;
  clientID?: ClientID;
  persistentID?: string;
}

export function slog(msg: slogMsg): void {
  msg.severity = msg.severity ?? LogSeverity.Info;

  if (process.env.GAME_ENV == "dev") {
    // Avoid blowing up the log during development.
    if (msg.logKey == "client_console_log") {
      return;
    }
    if (msg.severity != LogSeverity.Debug) {
      console.log(msg.msg);
    }
  } else {
    try {
      console.log(JSON.stringify(msg));
    } catch (error) {
      console.error("Failed to stringify log message:", error);
      // Fallback to basic logging
      console.log(`${msg.severity}: ${msg.msg}`);
    }
  }
}
