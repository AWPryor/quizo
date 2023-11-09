const socket = io(); // Connect to Socket.io server

// Get the player name from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const playerName = urlParams.get('player');

// Set the text of the span element to the player name
const playerNameSpan = document.getElementById('player-name');
playerNameSpan.textContent = playerName;

const form = document.getElementById('quiz-creation-form');


form.addEventListener('submit', (event) => {
  event.preventDefault();

  // Disable the submit button to prevent multiple submissions
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const isPublic = document.getElementById('public-room-checkbox').checked;
  const visibility = isPublic ? 'public' : 'private';

  // Fetch values for theme and difficulty
  const theme = document.querySelector('input[name="theme"]').value;
  console.log(theme)
  const difficulty = document.querySelector('select[name="difficulty"]').value;

  const room = {
    hostName: playerName,
    theme: theme,
    difficulty: difficulty,
    players: [],  // Empty players array initialized
    visibility: visibility
  };

  // Show the loading bar
const loadingBarContainer = document.getElementById('loading-bar-container');
loadingBarContainer.style.display = 'block';
const loadingBar = document.getElementById('loading-bar');

// For demonstration, we'll just make the bar fill up in 5 seconds. Adjust as needed.
let width = 0;
const interval = setInterval(() => {
    if (width >= 100) {
        clearInterval(interval);
        return;
    }
    width++;
    loadingBar.style.width = width + '%';
}, 400);

  socket.emit('create room', room);

  socket.on('quiz created', (data) => {
    console.log('Received "quiz created" event from server:', data);

    const gameId = data.gameId;  // Assuming the server provides gameId in the data object

    window.location.href = `/waiting-room.html?player=${encodeURIComponent(playerName)}&gameId=${encodeURIComponent(gameId)}&role=${encodeURIComponent("host")}`;
  });
});  // Closing the form event listener

socket.on('error', (data) => {
    console.error('Error received from server:', data.error);

    // Hide the loading bar
    const loadingBarContainer = document.getElementById('loading-bar-container');
    loadingBarContainer.style.display = 'none';

    // Reset the loading bar width to 0
    const loadingBar = document.getElementById('loading-bar');
    loadingBar.style.width = '0';

    // Enable the submit button again so the user can try again
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;

    // Optionally, display an error message to the user
    alert('Error: ' + data.error + '. Please try again with a different quiz theme.');
});
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
