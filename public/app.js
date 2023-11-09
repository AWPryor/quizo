
document.addEventListener('DOMContentLoaded', function() {
const socket = io();
socket.emit('get public rooms');
console.log('emited');

const globalUsernameInput = document.getElementById('global-username');
const createGameBtn = document.getElementById('create-game-btn');
const joinGameBtn = document.getElementById('join-game-btn');
const joinRoomIdInput = document.getElementById('join-room-id');
const body = document.getElementById('body'); // Get the body element
console.log(body)

// Check the screen width to determine if it's a mobile device
function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
        return true;
    }

    if (/android/i.test(userAgent)) {
        return true;
    }

    // iOS detection from: http://stackoverflow.com/a/9039885/177710
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return true;
    }

    return false;
}


function setBackgroundImage() {
    if (isMobile()) {
        console.log('mobile')
        body.style.backgroundImage = 'url("background-mobile.png")';

    } else {
        console.log('desktop')
        body.style.backgroundImage = 'url("background.png")';
    }
}


// Call the function to set the initial background image
setBackgroundImage();

// Update the background image if the window is resized
window.addEventListener('resize', setBackgroundImage);


socket.on('public rooms list', (publicRooms) => {
  console.log(publicRooms)

  const tableBody = document.getElementById('public-room-list').querySelector('tbody');
  tableBody.innerHTML = ''; // Clear any existing rows

  publicRooms.forEach(room => {
    const rowElem = document.createElement('tr');

    // Host
    const hostCell = document.createElement('td');
    hostCell.textContent = room.hostName;
    rowElem.appendChild(hostCell);

    // Players
    const playersCell = document.createElement('td');
    playersCell.textContent = `${room.playerCount} players`;
    rowElem.appendChild(playersCell);

    // Status
    const statusCell = document.createElement('td');
    statusCell.textContent = room.status;
    rowElem.appendChild(statusCell);

    // Theme
    const themeCell = document.createElement('td');
    themeCell.textContent = room.theme;
    rowElem.appendChild(themeCell);

    // Difficulty
    const difficultyCell = document.createElement('td');
    difficultyCell.textContent = room.difficulty;
    rowElem.appendChild(difficultyCell);

    // Join Button
    const actionCell = document.createElement('td');
    const joinButton = document.createElement('button');
    joinButton.textContent = 'Join Game';
    joinButton.addEventListener('click', () => {
      const username = globalUsernameInput.value;
      if (!username) {
          alert('Please enter a username before joining a game.');
          return;
      }

      // Logic to join the game goes here. You can use `room.gameId` to reference the game.
      window.location.href = `waiting-room.html?player=${username}&gameId=${room.gameId}&role=join`; // For example, redirect to a join game page
    });
    actionCell.appendChild(joinButton);
    rowElem.appendChild(actionCell);

    // Append the entire row to the table
    tableBody.appendChild(rowElem);
  });
});


createGameBtn.addEventListener('click', () => {
    const username = globalUsernameInput.value;
    if (!username) {
        alert('Please enter a username before creating a game.');
        return;
    }

    // TODO: send username to server if needed

    // redirect to game creation page
    window.location.href = 'game-creation.html?player=' + encodeURIComponent(username);
});

joinGameBtn.addEventListener('click', () => {
    const username = globalUsernameInput.value;
    const roomId = joinRoomIdInput.value;

    if (!username) {
        alert('Please enter a username before joining a game.');
        return;
    }

    if (!roomId) {
        alert('Please enter a Room ID to join.');
        return;
    }

    // TODO: validate username and room ID

    // redirect to waiting room page
    window.location.href = `waiting-room.html?player=${username}&gameId=quiz-${roomId}&role=join`;
});
});
