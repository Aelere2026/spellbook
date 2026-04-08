import * as log from "../util/log"

export function showcaseLogger() {
    log.debug("A secret debugging message...")
    log.log("A harmless message...")
    log.info("Like log but more colorful :)")
    log.warn("A not so spooky warning.")
    log.error("A spooky error!")
    log.fatal("A terrifying fatal error!")

    log.setVerbosity("WARN")
    log.warn("This one will print!")
    log.debug("But this one wont!")
}
