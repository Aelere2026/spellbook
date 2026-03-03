import api from "./api"


async function doStuff() {
    console.log("Here is what i got from the server: ")
    console.log(await api.markets.get.query())

    // You'll obvs wanna do some actual real reactive pretty things but ill leave that up to you leah

    document.body.innerHTML += `<h1>check the console lol</h1>`
}

doStuff()
