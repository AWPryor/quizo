const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const playerName = urlParams.get('player');
const role = urlParams.get('role');



let currentQuestionIndex = 0;
let questions = [];
let playersPoints = {};

const socket = io();

window.addEventListener('pagehide', function() {
        console.log('test')
        socket.emit("delete", gameId, playerName);
        socket.emit('get players', gameId);
    })

// Establish connection and join the game room
socket.emit('join game', gameId, playerName);


socket.emit('get players',gameId);

socket.on('player list', ({ playerNames, points }) => {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = ''; // Clear the previous list

    playerNames.forEach((playerName) => {
        const playerPoints = points[playerName] || 0;
        const listItem = document.createElement('li');
        listItem.textContent = `${playerName} (Points: ${playerPoints})`;
        playerList.appendChild(listItem);
    });
});





socket.on('game details', (data) => {
    displayGameDetails(data.theme, data.difficulty);
});


socket.on('load', (data) => { // Note: I've added a data parameter


  // Load the questions for the given theme and difficulty
  loadQuestions(data.questions);

})

socket.on('points updated', (data) => { // Note: I've added a data parameter
  displayPlayers(data)
  // Load the questions for the given theme and difficulty

})


socket.on('finished', (winner) => {
    console.log("everyone finished");
    console.log("Winner:", winner);

    // Retrieve all list items in the playerList
    const playerListItems = document.querySelectorAll('#playerList li');

    playerListItems.forEach(item => {
        // Check if the player's name in the list item matches the winner's name
        if (item.textContent.includes(winner)) {
            item.classList.add('winner');  // Add 'winner' class to highlight in green
        }
    });

    // Show the end screen
    //showEndScreen(winner);  // This function seems to duplicate some logic; you might want to refactor it

    // Create a button element
    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to Homepage';
    returnButton.addEventListener('click', () => {
        // Navigate to the homepage
        window.location.href = '/homepage.html';
    });

    // Append the button to the body or another container element
    document.body.appendChild(returnButton);
});





function displayGameDetails(theme, difficulty) {
    const themeElement = document.getElementById('theme');
    const difficultyElement = document.getElementById('difficulty');

    if (themeElement && difficultyElement) {
        themeElement.textContent = theme;
        difficultyElement.textContent = difficulty;
    }
}


function loadQuestions(receivedQuestions) {
    questions = receivedQuestions;
    displayQuestion(0);
}




function displayQuestion(index) {
    if (index >= questions.length) {
        // All questions have been answered, display "Quiz Finished"
        const questionElement = document.getElementById('question');
        questionElement.textContent = 'Quiz Finished';

        const optionsElement = document.getElementById('options');
        optionsElement.innerHTML = '';
        // Inside your event handler where a player finishes the quiz
        socket.emit('finished', gameId, playerName);


        return;
    }

    const questionData = questions[index];
    const questionElement = document.getElementById('question');
    const optionsElement = document.getElementById('options');

    questionElement.textContent = questionData.question;
    optionsElement.innerHTML = '';

    questionData.options.forEach((option, idx) => {
        const optionButton = document.createElement('button');
        optionButton.textContent = option;
        optionButton.addEventListener('click', () => {
            checkAnswer(idx, questionData.correctAnswer);
            displayQuestion(currentQuestionIndex + 1);
        });
        optionsElement.appendChild(optionButton);
    });
}

function showEndScreen(winner) {
    const endScreenElement = document.getElementById('endScreen');
    const playerListElement = document.getElementById('playerList');

    // Display all players' names and scores
    for (const [player, points] of Object.entries(playersPoints)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${player}: ${points} points`;
        playerListElement.appendChild(listItem);

        // Check if the player is the winner and highlight them
        if (player === winner) {
            listItem.classList.add('winner');
        }
    }
}



document.getElementById('showPlayerList').addEventListener('click', function() {
    var playerList = document.getElementById('playerList');
    if (playerList.style.display === 'none' || playerList.style.display === '') {
        playerList.style.display = 'block';
    } else {
        playerList.style.display = 'none';
    }
});



function checkAnswer(selectedIndex, correctIndex) {
    const questionElement = document.getElementById('question');
    const optionsElement = document.getElementById('options');
    socket.emit('counter', gameId, playerName);

    if (selectedIndex === correctIndex) {
        console.log('Correct Answer!');
        updatePlayerScore(playerName);

        // Add green flash animation to the question element
        questionElement.classList.add('flash-correct');

        // Remove the flash class after a short delay
        setTimeout(() => {
            questionElement.classList.remove('flash-correct');
        }, 500); // 500ms (0.5 seconds) delay
    } else {
        console.log('Wrong Answer!');

        // Add red flash animation to the question element
        questionElement.classList.add('flash-wrong');

        // Remove the flash class after a short delay
        setTimeout(() => {
            questionElement.classList.remove('flash-wrong');
        }, 500); // 500ms (0.5 seconds) delay
    }
    currentQuestionIndex++;
}



function updatePlayerScore(player) {
        socket.emit('update points', gameId, playerName);
        displayPlayers();
}




function displayPlayers() {
    const playerListElement = document.getElementById('playerList');
    for (const [player, points] of Object.entries(playersPoints)) {
        const listItem = document.createElement('li');
        listItem.textContent = `${player}: ${points} points`;
        playerListElement.appendChild(listItem);
    }
}
