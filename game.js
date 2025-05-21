const games = {};

class Player {
    constructor(name, color, playerID, gameID) {
        this.name = name;
        this.color = color;
        this.playerID = playerID;
        this.gameID = gameID;
    }
}

const addPlayer = ({ gameID, name, playerID }) => {
    if (!games[gameID]) {
        const color = Math.random() <= 0.5 ? 'w' : 'b';
        const player = new Player(name, color, playerID, gameID);
        games[gameID] = [player];
        return {
            message: 'Joined successfully',
            opponent: null,
            player,
        };
    }

    if (games[gameID].length >= 2) {
        return { error: 'This game is full' };
    }

    const opponent = games[gameID][0];
    const color = opponent.color === 'w' ? 'b' : 'w';
    const player = new Player(name, color, playerID, gameID);
    games[gameID].push(player);

    return {
        message: 'Added successfully',
        opponent,
        player,
    };
};


const game = (id) => games[id];

const removePlayer = (playerID) => {
    for (const gameID in games) { // Renamed 'game' to 'gameID' for clarity
        let players = games[gameID];
        const index = players.findIndex((pl) => pl.playerID === playerID);

        if (index !== -1) {
            const removedPlayer = players.splice(index, 1)[0];
            if (players.length === 0) {
                delete games[gameID];
                console.log(`Game room ${gameID} was empty and has been deleted.`); // Optional: for logging
            }
            return removedPlayer;
        }
    }
};

module.exports = {
    addPlayer,
    game,
    removePlayer,
};