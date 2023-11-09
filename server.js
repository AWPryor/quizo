const express = require('express');
const app = express();
const axios = require('axios');
const fs = require('fs');
const http = require('http');
const OpenAI = require("openai");
const server = http.createServer(app);
const hostname = '0.0.0.0';
const io = require('socket.io')(server);
const fetch = require('node-fetch');
const path = require('path');
const openai = new OpenAI({ apiKey: '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' });
const PORT = process.env.PORT || 3000;

// Declare the games object
const games = {};

// Create a map to track finished players for each game
const finishedPlayers = {};

// Set up the express app
app.use(express.static('public'));



// Add this above your io.on('connection') block:
const activeTimers = {};



// Extract the logic to fetch public rooms into its own function
function getPublicRooms() {
    const publicRooms = Object.entries(games)
        .filter(([_, game]) => game.visibility === 'public' && game.status === 'waiting')
        .map(([gameId, game]) => ({
            gameId,
            hostName: game.hostName,
            playerCount: game.players.length,
            status: game.status,
            theme: game.theme,
            difficulty: game.difficulty
        }));
    return publicRooms;
}

setInterval(() => {
    const publicRooms = getPublicRooms();
    io.emit('public rooms list', publicRooms);  // Emit to all connected clients
}, 5000);  // Every 5 seconds



const GAME_CLEANUP_TIMEOUT = 120000; // 120 seconds
const GRACE_PERIOD = 30000; // 30 seconds

setInterval(() => {
    const currentTime = Date.now();

    for (let gameId in games) {
        const game = games[gameId];

        if (game.status === 'initializing') {
            // Skip games that are still initializing
            continue;
        }

        if (game.creationTime && currentTime - game.creationTime < GRACE_PERIOD) {
            // Newly created games are given a grace period before checking for deletion.
            continue;
        }

        const playerCount = game.players.length;

        if (playerCount <= 0) {
            if (!activeTimers[gameId]) {
                console.log(`Game room ${gameId} has Entered the grace period.`);
                activeTimers[gameId] = setTimeout(() => {
                    delete games[gameId];
                    delete finishedPlayers[gameId];
                    delete activeTimers[gameId];
                    console.log(`Game room ${gameId} has been deleted due to inactivity.`);
                }, GAME_CLEANUP_TIMEOUT);
            }
        } else {
            if (activeTimers[gameId]) {
                clearTimeout(activeTimers[gameId]);
                delete activeTimers[gameId];
            }
        }
    }
}, GAME_CLEANUP_TIMEOUT);



// Function to get OpenAI questions

async function fetchOpenAIQuestions(theme, difficulty, quantity) {
    try {
        const response = await axios({
            method: 'post',
            url: 'https://friendlyjew-goyimproxy.hf.space/proxy/openai/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer 2afcaf36-02f9-4ed9-b15c-23e1532e4cde'
            },
            data: {
                model: "gpt-4",
                max_tokens: 5000,
                messages: [
                    {
                        role: "assistant",
                        content: `You are a quiz generating machine. Your job is to come up with questions in the theme and difficulty the user wants. The user will input [theme].[dificulty].[quantity of quesitons]. When defining difficulty:
- "easy" means questions that a casual viewer or reader might know.
- "medium" means questions that someone reasonably familiar with the subject might know.
- "hard" means questions that only die-hard fans or experts would likely know.

Please make sure the questions are of the correct difficulty. Respond in the following json format:
[
    {
        "question": "Question here...",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": index of correct answer
    }
]`
                    },
                    {
                        role: "user",
                        content: `${theme}.${difficulty}.${quantity}`
                    }
                ]
            }
        });

        // Check the response and return the desired content
        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content;
        } else {
            console.log("Failed to get a valid response from OpenAI.");
            return null;
        }

    } catch (error) {
        console.error("Error fetching response from OpenAI:", error);
        return null;
    }
}
// Set up the Socket.io server
io.on('connection', (socket) => {
    console.log('A user connected');



    socket.on('Start game', (gameId) => {
        if (!games[gameId]) {
            console.log('Game not found:', gameId);

            return;
        }
        games[gameId].status = 'In-Progress';
        // Emit a "Start game" event to all clients in the game room
        io.to(gameId).emit('Start game');

        // Load game details and questions here
        const gameDetails = games[gameId];
        io.to(gameId).emit('load', gameDetails);
        console.log('Received "Start Game" and sent "load" event:', { gameId }, gameDetails);
    });


    socket.on('loader', (gameId) => {
        // Load game details and questions here
        const gameDetails = games[gameId];
        io.emit('load', gameDetails);
        console.log('Received sent "load" event:', { gameId }, gameDetails);
    });


    socket.on('get players', (gameId) => {
        if (games[gameId]) {
            const playerNames = games[gameId].players;
            const points = games[gameId].points;
            socket.emit('player list', { playerNames, points });
        } else {
            console.log('Game not found:', gameId);
        }
    });


    socket.on('create room', async (data) => {
        // Generate a unique game ID
        const gameId = `quiz-${Date.now()}`;

        console.log(`Socket ${socket.id} created quiz ${gameId}`);

        // Initialize game structure
        games[gameId] = {
            hostName: data.hostName,
            theme: data.theme,
            difficulty: data.difficulty,
            players: [],  // Initializing players array
            points: {},   // Example format: { 'PlayerName1': 0, 'PlayerName2': 5 }
            questions: [], // This will store shuffled questions
            visibility: 'private', // default to private
            status: 'initializing', // either 'waiting' or 'in-progress'
            creationTime: Date.now()
        };
        console.log("questions")

            // Use OpenAI to fetch questions
        const questions = await fetchOpenAIQuestions(data.theme, data.difficulty, 10);
        games[gameId].status = 'waiting';  // Update status to waiting once initialization is complete
        console.log(questions)
        if (questions.startsWith('Sorry')) {
            console.error('Error fetching questions:', questions);
            // Handle error, e.g., by emitting an error event to the client
            socket.emit('error', { error: 'Failed to fetch questions' });
            return;  // Exit early to prevent further processing
          }
        games[gameId].questions = questions;
        passedquestions = JSON.parse(questions)
            // Shuffle and get 10 questions
            // Store these shuffled questions in the game's object
        games[gameId].questions = passedquestions;
        games[gameId].visibility = data.visibility; // data.visibility should be sent by the client
        console.log(games[gameId])
        // Emit a "quiz created" event to the client with all the required data
        const responseData = {
            gameId,
            theme: data.theme,
            difficulty: data.difficulty
        };

        // Join the Socket.io room for this game
        socket.join(gameId);
        io.to(gameId).emit('quiz created', responseData);

        console.log('Sent "quiz created" event:', responseData);
    });


    socket.on('get public rooms', () => {
        const publicRooms = getPublicRooms();
        socket.emit('public rooms list', publicRooms);
    });




    socket.on('update points', (gameId, playerName) => {
        if(games[gameId] && games[gameId].points[playerName] !== undefined) {
            games[gameId].points[playerName]++;
            console.log(games[gameId])

            const playerNames = games[gameId].players;
            const points = games[gameId].points;
            io.to(gameId).emit('player list', { playerNames, points });


            // Emit updated points to all players in the room
            io.emit('points updated', games[gameId].points);
        }
    });

    socket.on('finished', (gameId, playerName) => {
        console.log(`user ${playerName} finished the quiz`);
        if (!finishedPlayers[gameId]) {
            finishedPlayers[gameId] = [];
        }

        finishedPlayers[gameId].push(playerName);

        const game = games[gameId];
        const playerCount = game.players.length;

        // Check if all players have finished
        if (finishedPlayers[gameId].length === playerCount) {
            // All players have finished, calculate the player with the most points
            let maxPointsPlayer = null;
            let maxPoints = -1;

            for (const player in game.points) {
                if (game.points.hasOwnProperty(player)) {
                    if (game.points[player] > maxPoints) {
                        maxPoints = game.points[player];
                        maxPointsPlayer = player;
                    }
                }
            }

            // Emit the 'finished' event with the player who has the most points
            console.log(`all users in ${gameId} have finished the quiz`);
            io.emit('finished', maxPointsPlayer);
        }
    });


    socket.on('join game', (gameId, playerName) => {
        console.log('Received "join game" event from:', playerName, 'Game ID:', gameId);


        if (!games[gameId]) {
            console.log('Game not found:', gameId);
            return;
        }

        const player = playerName;
        games[gameId].points[player] = 0;
        const existingPlayers = games[gameId].players;
        socket.emit('game details', {
            theme: games[gameId].theme,
            difficulty: games[gameId].difficulty
        });

        // Check if the player is already in the game
        if (existingPlayers.includes(player)) {
            console.log('Player', player, 'is already in the game!');
            socket.emit('game details', {
                theme: games[gameId].theme,
                difficulty: games[gameId].difficulty
            });
            const gameDetails = games[gameId];
            console.log("sending load", gameDetails)
            io.emit('load', gameDetails);


            console.log("sent load")
            return;
        }


        // Create a new array of players that includes the existing players plus the new player
        const updatedPlayers = [...existingPlayers, player];

        // Set the updated players array as the value of the players property for the given game ID
        games[gameId].players = updatedPlayers;

        // Have the player join the Socket.io room for this game
        socket.join(gameId);

        // Emit a "player joined" event to all clients in the game room
        io.to(gameId).emit('player joined', { playerName, players: updatedPlayers });
        console.log('Sent "player joined" event:', { playerName, players: updatedPlayers });
    });


    socket.on('delete', (gameId, playerName) => {
        console.log(`Removing player "${playerName}" from game "${gameId}"`);

        // Remove the player from the list of players for the game
        if (games[gameId]) {
            const index = games[gameId].players.indexOf(playerName);
            if (index !== -1) {
                games[gameId].players.splice(index, 1);
            }
            if (games[gameId]) {
                const playerNames = games[gameId].players;
                const points = games[gameId].points;
                console.log('sending new playerlist')
                io.to(gameId).emit('player list', { playerNames, points });
            } else {
                console.log('Game not found:', gameId);
            }
        }

    });




}); // This is the closing bracket for the main io.on('connection', ...) block



// Start the server
server.listen(PORT, hostname, () => {
    console.log(`Server listening on port ${PORT}`);
});
