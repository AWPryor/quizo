const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const server = http.createServer(app);
const hostname = '0.0.0.0';
const io = require('socket.io')(server);
const fetch = require('node-fetch');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: "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",
});

const OPENAI_API_KEY = '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';
const endpoint = 'https://api.openai.com/v1/images/generations';






const PORT = process.env.PORT || 3000;

// Declare the games object
const games = {};


// Set up the express app
app.use(express.static('public'));

// Set up the Socket.io server
io.on('connection', (socket) => {
  console.log('A user connected');






    socket.on('delete', (gameId, playerName) => {
      console.log(`Removing player "${playerName}" from game "${gameId}"`);

      // Remove the player from the list of players for the game
      if (games[gameId]) {
        const index = games[gameId].players.indexOf(playerName);
        if (index !== -1) {
          games[gameId].players.splice(index, 1);
        }
      }


      // Send the updated player list to all clients in the room
      const playerNames = games[gameId] ? games[gameId].players : [];
      console.log('playerlist: ',games[gameId].players);
      console.log('emiting to all', gameId)
      io.to(gameId).emit('player list', playerNames);
      console.log('emited to all');
    });


    socket.on('Start game',(gameId) => {
      io.to(gameId).emit('Start game');
      const existingPlayers = games[gameId];
      console.log('Received "Start Game"', {gameId}, existingPlayers);
    });

    socket.on('loadImage', async (gameId, pro) => {
      console.log(gameId)
      const id = gameId
      const data = {
        prompt:pro,
        n: 1,
        size: '256x256'
      };

      console.log('sending')
      fetch('https://api.novelai.net/ai/generate-image', {
  method: 'POST',
  headers: {
    'accept': '*/*',
    'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8',
    'authority': 'api.novelai.net',
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJkMkt6VmR0eHdxb3R1MnMweEhXVSIsIm5jIjoiLTBWRnBfdkF4d1ExUXhDbTNMLTNFIiwiaWF0IjoxNjc4NjYwNTY2LCJleHAiOjE2ODEyNTI1NjZ9.1nSafvoNRL3arcVp5Qd6sOL1_rz7up1VgWlpMNuFGDw',
    'content-type': 'application/json',
    'origin': 'https://novelai.net',
    'referer': 'https://novelai.net/',
    'sec-ch-ua': '^\\^Chromium^^;v=^\\^110^^, ^\\^Not',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '^\\^Windows^^',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63'
  },
  body: JSON.stringify({
    input: pro,
    model: 'safe-diffusion',
    parameters: {
      width: 512,
      height: 768,
      scale: 11,
      sampler: 'k_euler_ancestral',
      steps: 28,
      seed: 2581820020,
      n_samples: 1,
      ucPreset: 0,
      qualityToggle: true,
      autoSmea: true,
      uc: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry'
    }
  })
})
  .then(response => response.text())
  .then(data => {
    const startIndex = data.indexOf('data:') + 5;
    const endIndex = data.length;
    const imageData = data.slice(startIndex, endIndex);
    const imageBuffer = Buffer.from(imageData, 'base64');
    const imagePath = './public/image.png';
    fs.writeFile(imagePath, imageBuffer, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      const imageUrl = '/image.png';
      io.to(id).emit('image', imageUrl);
    });
  })
  .catch(error => {
    console.error(error);
  });







    });

    socket.on('begin',(gameId) => {
      console.log('Begining game',gameId,'mode: ', games[gameId].mode);
      console.log('Selecting current player');
      games[gameId].CurrentPlayer = games[gameId].hostName;
      games[gameId].CurrentRound = 0;
      const currentplayer = games[gameId].CurrentPlayer;
      const mode = games[gameId].mode;
      console.log(games[gameId])
      if (games[gameId].mode === "classic"){
        console.log(' El Clasico')
        const players=games[gameId].players
        io.to(gameId).emit('clasico',mode,players);
      }
      io.to(gameId).emit('currentplayer', currentplayer);
    });

    socket.on('create room', (data) => {
      console.log('Received "create room" event:', data);

      // Generate a unique game ID
      const gameId = `game-${Date.now()}`;

       console.log(`Socket ${socket.id} joined room ${gameId}`);
      // Add the game to the list of games
      games[gameId] = {
        hostName: data.hostName,
        rounds: data.rounds,
        players: data.players.map(p => p.playerName),
        timmer: data.timmer,
        mode: data.mode
      };
      // Emit a "room created" event to the client
      const responseData = { gameId };
      socket.emit('room created', responseData);

      console.log('Sent "room created" event:', responseData);
    });


    socket.on('join game', (gameId, playerName) => {
        console.log('Received "join game" event from:',playerName,'Game ID: ', gameId );
        const player = playerName;

        // Get the game ID and player name from the data

        // Get the existing players for the game
        const existingPlayers = games[gameId].players;
        if (existingPlayers.includes(player)) {
  console.log('Player', player, 'is already in the game!');
  return;
}
        // Create a new array of players that includes the existing players plus the new player
        const updatedPlayers = [...existingPlayers, player];

        // Set the updated players array as the value of the players property for the given game ID
        games[gameId].players = updatedPlayers;

        // Emit a "player joined" event to all clients in the game room
        io.to(gameId).emit('player joined', { playerName, players: updatedPlayers });

        console.log('Sent "player joined" event:', { playerName, players: updatedPlayers });
      });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('next player', (gameId) => {
    const currentGame = games[gameId];
    const currentIndex = currentGame.players.indexOf(currentGame.CurrentPlayer);
    const nextIndex = (currentIndex + 1) % currentGame.players.length;



      if (currentIndex === currentGame.players.length - 1) {
        console.log('newround started'); // Print "hi" when the last player completes a round
        games[gameId].CurrentRound = games[gameId].CurrentRound+1;
        console.log( games[gameId].CurrentRound);
        const currentr = games[gameId].CurrentRound;
        io.to(gameId).emit('rounds', (currentr));
        if (currentr === games[gameId].rounds){
          io.to(gameId).emit('end');
        }
      }
    // Set the currentPlayer property to the name of the next player
    currentGame.CurrentPlayer = currentGame.players[nextIndex];

    console.log(games[gameId]);
    const currentplayer = games[gameId].CurrentPlayer;
    io.to(gameId).emit('currentplayer',(currentplayer));
  });


  socket.on('get players', (gameId) => {
    const playerNames = games[gameId].players;
    console.log('playerlist: '+playerNames);
    console.log('emmiting to '+gameId);
    socket.join(gameId);
    const rounds = games[gameId].rounds
    io.to(gameId).emit('player list', playerNames, rounds);
  });
});





// Start the server
server.listen(PORT, hostname, () => {
  console.log(`Server listening on port ${PORT}`);
});
