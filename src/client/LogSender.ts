import { EventBus } from "../core/EventBus"
import { LogSeverity } from "../core/Schemas"
import { SendLogEvent } from "./Transport"

let inited = false

export function initializeLogSender(eventBus: EventBus) {
    if (inited) {
        return
    }
    inited = true

    // Store original console methods
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    const log = (msg: string): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Info, msg))
        originalLog.call(console, msg)  // Use the original method
    }

    const warn = (msg: string): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Warn, msg))
        originalWarn.call(console, msg)  // Use the original method
    }

    const error = (msg: string): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Error, msg))
        originalError.call(console, msg)  // Use the original method
    }

    // Replace console methods
    console.log = log
    console.warn = warn
    console.error = error
}