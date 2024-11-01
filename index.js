const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { addPlayer, game, removePlayer } = require('./game');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "https://chess-frontend-neon.vercel.app/", // React app URL
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
            if (game(gameID).length >= 2) {
                const white = game(gameID).find((player) => player.color === 'w');
                io.to(gameID).emit('message', {
                    message: `Let's start the game. White (${white.name}) goes first`,
                });
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
            io.to(player.game).emit('message', {
                message: `${player.name} has left the game.`,
            });
            socket.broadcast.to(player.game).emit('opponentLeft');
        }
    });
});

const PORT = process.env.PORT || 2344;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
