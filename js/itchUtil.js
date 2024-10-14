const games = {
    "rogueblade-i": "11638004",
    "rogueblade-ii": "11638082",
    "rat-in-space": "8347177",
    "mechaponga": "10719092",
    "a-little-survival": ""
}

function getGameData(name)
{
    return new Promise((resolve)=>(
        Itch.getGameData({
            user: "Danior",
            game: name,
            onComplete: function(data) {
                if (data["errors"] == null)
                {
                    data["embedId"] = games[name]
                }
                resolve(data)
            }
        })
    ))
}