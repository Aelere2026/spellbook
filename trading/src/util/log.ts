import c from "ansi-colors"
import { NumberInstance } from "twilio/lib/rest/pricing/v2/number"
import util from "util"

const verbosityOrder: Verbosity[] = ["DEBUG", "LOG", "INFO", "ALERT", "WARN", "ERROR", "FATAL"]
type Verbosity = "DEBUG" | "LOG" | "INFO" | "ALERT" | "WARN" | "ERROR" | "FATAL"
let loggerVerbosity: Verbosity = "DEBUG"

type TimestampFormat = "NONE" | "TIME" | "DATETIME" | "UTC" | "ISO"
let loggerTimestampFormat: TimestampFormat = "TIME"
/**
 * Controls how verbose the logger should be.
 *
 * Here are the verbosity levels in order of most to least verbose:
 * - DEBUG
 * - LOG
 * - INFO
 * - ALERT
 * - WARN
 * - ERROR
 * - FATAL
 */
export function setVerbosity(verbosity: Verbosity) {
    loggerVerbosity = verbosity
}

export function setTimestampFormat(format: TimestampFormat) {
    loggerTimestampFormat = format
}

export function debug(...msgs: any[]) {
    print("DEBUG", c.green, msgs)
}

export function log(...msgs: any) {
    print("LOG", c.white, msgs)
}

export function info(...msgs: any[]) {
    print("INFO", c.cyan, msgs)
}

export function alert(...msgs: any[]) {
    print("ALERT", c.magenta, msgs)
}

export function warn(...msgs: any[]) {
    print("WARN", c.yellow, msgs)
}

export function error(...msgs: any[]) {
    print("ERROR", c.red, msgs)
}

export function fatal(...msgs: any[]) {
    print("FATAL", c.bgBlack.red, msgs)
}

export function newline() {
    console.log()
}

function print(verbosity: Verbosity, format: c.StyleFunction, msgs: any[]) {
    // TODO: indexOf probs isn't super performant? But also its 7 elements long so its probs okay?
    if (verbosityOrder.indexOf(loggerVerbosity) <= verbosityOrder.indexOf(verbosity)) {
        const verbosityStr = c.bold(`[${verbosity}]`)

        // We use util.inspect so that our objects look normal and not like "[object Object]" when printing
        const msgsStr = msgs.map(msg => {
            if (typeof msg === "object") {
                return util.inspect(msg, { depth: Number.POSITIVE_INFINITY })
            } else {
                return msg
            }
        }).join(" ")

        const now = Date.now()
        let timestampStr = ""
        switch (loggerTimestampFormat) {
            case "TIME":
                timestampStr = time.format(now)
                break
            case "DATETIME":
                timestampStr = dateTime.format(now)
                break
            case "UTC":
                timestampStr = new Date(now).toUTCString()
                break
            case "ISO":
                timestampStr = new Date(now).toISOString()
                break
            default: // FALLTHROUGH!!
                console.error("Invalid logger format!!")
            case "NONE":
                timestampStr = ""
                break
        }
        if (timestampStr !== "") {
            timestampStr = c.bold(`[${timestampStr}] - `)
        }

        console.log(format(`${verbosityStr} ${timestampStr}${msgsStr}`))
    }
}

const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
})

const dateTime = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
})