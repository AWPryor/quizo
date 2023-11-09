const socket = io(); // Connect to Socket.io server

// Get the player name, game ID, and role from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get('player');
const gameId = urlParams.get('gameId');
const role = urlParams.get('role');



//window.addEventListener('pagehide', function() {
//        console.log('test')
//        socket.emit("delete", gameId, playerName);
//        socket.emit('get players', gameId);
//    })


// Set the text of the span elements to the player name and game ID
const playerNameSpan = document.getElementById('player-name');
playerNameSpan.textContent = playerName;

const gameIdSpan = document.getElementById('game-id');
gameIdSpan.textContent = `${gameId}`;



const startGameButton = document.getElementById('start-game-button');


if (role !== 'host') {
  startGameButton.style.display = 'none';
}
startGameButton.addEventListener('click', () => {
    console.log(`Starting game "${gameId}"`);
    socket.emit('Start game', gameId);
});

socket.emit('join game', gameId, playerName);

// Keep track of the player list on the client side
const playerList = document.getElementById('player-list');
let players = [];
console.log(players);

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('player joined', (data) => {
    console.log("bob");
    console.log(data.players)
    updatePlayerList(data.players);
});


socket.on('game details', (data) => {
   console.log("details")
    displayGameDetails(data.theme, data.difficulty);
});


socket.on('player list', ({ playerNames, points }) => {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = ''; // Clear the previous list

    playerNames.forEach((playerName) => {
        const playerPoints = points[playerName] || 0;
        const listItem = document.createElement('li');
        listItem.textContent = `${playerName} (Points: ${playerPoints})`;
        if (role === 'host') {

        var deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function() {
          // When the delete button is clicked, emit the 'delete' event
          socket.emit("delete", gameId, playerName);
        });
                listItem.appendChild(deleteButton);
      }
        playerList.appendChild(listItem);
    });
});


socket.on('Start game', () => {
    console.log('Received "start game" event from server');
    // Redirect to the game page
    window.location.href = `/game.html?player=${encodeURIComponent(playerName)}&gameId=${encodeURIComponent(gameId)}&role=${encodeURIComponent(role)}`;
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

// Helper function to update the player list on the page
function updatePlayerList(playerNames) {
  // Get the <ul> element where you want to display the player list
  var playerList = document.getElementById("player-list");

  // Clear the current player list
  playerList.innerHTML = "";

  // Loop through the player names and add them to the player list
  for (var i = 0; i < playerNames.length; i++) {
    var playerName = playerNames[i];
    var listItem = document.createElement("li");

    // Create a delete button for each player
    var deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function() {
      // When the delete button is clicked, emit the 'delete' event
      socket.emit("delete", gameId, playerName);
    });

    listItem.textContent = playerName;
    listItem.appendChild(deleteButton);
    playerList.appendChild(listItem);
  }
}

function displayGameDetails(theme, difficulty) {
    console.log(theme, difficulty)
    const themeElement = document.getElementById('theme');
    const difficultyElement = document.getElementById('difficulty');

    if (themeElement && difficultyElement) {
        themeElement.textContent = theme;
        difficultyElement.textContent = difficulty;
    }
}

socket.emit('get players', gameId);
