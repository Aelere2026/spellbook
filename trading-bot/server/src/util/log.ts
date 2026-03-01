import c from "ansi-colors"


export function log(msg: any) {
    console.log(`${c.bold("[LOG]")} ${msg}`)
}

export function info(msg: any) {
    console.log(c.cyan(`${c.bold("[INFO]")} ${msg}`))
}

export function debug(msg: any) {
    console.log(c.green(`${c.bold("[DEBUG]")} ${msg}`))
}

export function warn(msg: any) {
    console.log(c.yellow(`${c.bold("[WARN]")} ${msg}`))
}

export function error(msg: any) {
    console.log(c.red(`${c.bold("[ERROR]")} ${msg}`))
}

export function fatal(msg: any) {
    console.log(c.bgBlack.red(`${c.bold("[FATAL]")} ${msg}`))
}