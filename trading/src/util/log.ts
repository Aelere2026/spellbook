import c from "ansi-colors"
import util from "util"

type Verbosity = "DEBUG" | "LOG" | "INFO" | "ALERT" | "WARN" | "ERROR" | "FATAL"
const verbosityOrder: Verbosity[] = ["DEBUG", "LOG", "INFO", "ALERT", "WARN", "ERROR", "FATAL"]

let loggerVerbosity: Verbosity = "DEBUG"

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

function print(msgVerbosity: Verbosity, format: c.StyleFunction, msgs: any[]) {
    // TODO: indexOf probs isn't super performant? But also its 6 elements long so its probs okay?
    if (verbosityOrder.indexOf(loggerVerbosity) <= verbosityOrder.indexOf(msgVerbosity)) {

        // We use util.inspect so that our objects look normal and not like "[object Object]" when printing
        const msgsStr = msgs.map(msg => {
            if (typeof msg === "object") {
                return util.inspect(msg, { depth: null })
            } else {
                return msg
            }
        }).join(" ")

        console.log(format(`${c.bold(`[${msgVerbosity}]`)} ${msgsStr}`))
    }
}