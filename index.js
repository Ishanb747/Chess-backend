const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { addPlayer, game, removePlayer } = require('./game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allows requests from any origin
        methods: ["GET", "POST"]
    }
});

// Basic route to respond to GET requests on the root path
app.get('/', (req, res) => {
    res.send('Socket.IO Server is running!'); // Response for root path
});

// Handle socket connection
io.on('connection', (socket) => {
    socket.on('join', ({ name, gameID }, callback) => {
        try {
            const { error, player, opponent } = addPlayer({
                name,
                playerID: socket.id,
                gameID,
            });

            if (error) {
                return callback({ error });
            }

            socket.join(gameID);
            callback({ color: player.color });

            // Send welcome message to player1, and also send the opponent player's data
            socket.emit('welcome', {
                message: `Hello ${player.name}, Welcome to the game`,
                opponent,
            });

            // Tell player2 that player1 has joined the game
            socket.broadcast.to(player.gameID).emit('opponentJoin', {
                message: `${player.name} has joined the game.`,
                opponent: player,
            });

            // Check if there are enough players to start the game
            const currentGame = game(gameID); // Get the game state once

            if (currentGame && currentGame.length >= 2) { // Check if currentGame exists and then check its length
                const white = currentGame.find((player) => player.color === 'w');
                // Ensure white player is found before accessing white.name, though this is less likely to be an issue if length is >= 2
                if (white) { 
                    io.to(gameID).emit('message', {
                        message: `Let's start the game. White (${white.name}) goes first`,
                    });
                } else {
                    // Optional: Handle case where white player isn't found, though theoretically,
                    // if currentGame.length >= 2, one player must be white.
                    // This could indicate another issue if reached.
                    console.error(`Error: White player not found in game ${gameID} even though player count is ${currentGame.length}`);
                }
            } else if (currentGame && currentGame.length < 2) {
                // Optional: Handle the case where the game exists but doesn't have enough players yet.
                // This part of the logic might already be handled by client-side or other server messages.
                // For now, just ensuring no error occurs is the priority.
                console.log(`Game ${gameID} has ${currentGame.length} player(s), waiting for more.`);
            } else if (!currentGame) {
                // This case should ideally be handled earlier, perhaps when `addPlayer` is called,
                // or the client should not be able to send a `join` event for a non-existent game
                // after an initial failed join. However, adding a safeguard here is good.
                console.error(`Error: Game with ID ${gameID} not found when checking to start the game.`);
                // Optionally, inform the client:
                // socket.emit('error', { message: `Game ${gameID} not found.` });
            }
        } catch (error) {
            console.error('Error in join event:', error); // Log the error for debugging
            callback({ error: 'An error occurred while joining the game.' }); // Inform the client
        }
    });

    socket.on('move', ({ from, to, gameID }) => {
        socket.broadcast.to(gameID).emit('opponentMove', { from, to });
    });

    socket.on('disconnect', () => {
        const player = removePlayer(socket.id);

        if (player) {
            io.to(player.gameID).emit('message', {
                message: `${player.name} has left the game.`,
            });
            socket.broadcast.to(player.gameID).emit('opponentLeft');
        }
    });
});

const PORT = process.env.PORT || 2344;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
