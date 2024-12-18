declare global {
    interface Console {
        localLog: typeof console.log;
        localWarn: typeof console.warn;
        localError: typeof console.error;
    }
}

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

    // Define networked logging functions (both local and remote)
    const log = (...args: any[]): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Info, args.join(' ')))
        originalLog.apply(console, args)
    }

    const warn = (...args: any[]): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Warn, args.join(' ')))
        originalWarn.apply(console, args)
    }

    const error = (...args: any[]): void => {
        eventBus.emit(new SendLogEvent(LogSeverity.Error, args.join(' ')))
        originalError.apply(console, args)
    }

    // Store local-only logging functions
    console.localLog = originalLog.bind(console)
    console.localWarn = originalWarn.bind(console)
    console.localError = originalError.bind(console)

    // Replace main console methods with networked versions
    console.log = log
    console.warn = warn
    console.error = error
}