gameList = null

function getGameList()
{
    if (gameList == null)
    {
        return new Promise((resolve)=>(
            fetch("games.json").then(
                (response)=>(response.json()).then(
                    (json)=>(
                        gameList = json,
                        resolve(gameList)
                    )
                )
            )
        ))
    }
    else
    {
        return new Promise((resolve)=>(
            resolve(gameList)
        ))
    }
}

function getGameEmbedId(name)
{
    return new Promise((resolve)=>(
        getGameList().then((json)=>resolve(json[name]))
    ))
}

function getGameData(name)
{
    return new Promise((resolve)=>(
        Itch.getGameData({
            user: "Danior",
            game: name,
            onComplete: function(data) {
                getGameEmbedId(name).then((id)=>(
                    data["embedId"] = id,
                    resolve(data)
                ))
            }
        })
    ))
}