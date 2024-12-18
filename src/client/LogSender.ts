import { EventBus } from "../core/EventBus"
import { SendLogEvent } from "./Transport"

export enum LogSeverity {
    Info,
    Warn,
    Error
}

export function initializeLogSender(eventBus: EventBus) {
    const log = (msg: string): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Info, msg))
        console.log(msg)
    }
    console.log = log
}