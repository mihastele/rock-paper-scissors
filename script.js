// script.js
let video = null;
let model = null;
let playing = false;
let playerScore = 0;
let computerScore = 0;

const gestures = {
    rock: 'rock',
    paper: 'paper',
    scissors: 'scissors',
    none: 'none'
};

// DOM Elements
const startButton = document.getElementById('start-camera');
const playButton = document.getElementById('play-round');
const resetButton = document.getElementById('reset-game');
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const playerGestureElement = document.getElementById('player-gesture');
const computerGestureElement = document.getElementById('computer-gesture');
const computerMoveElement = document.getElementById('computer-move');
const resultElement = document.getElementById('result');
const playerScoreElement = document.getElementById('player-score');
const computerScoreElement = document.getElementById('computer-score');

// Initialize the application
async function init() {
    console.log('Initializing application...');
    
    // Set up button event listeners
    startButton.addEventListener('click', startCamera);
    playButton.addEventListener('click', playRound);
    resetButton.addEventListener('click', resetGame);
    
    // Disable play button until camera is started
    playButton.disabled = true;
}

// Start the camera
async function startCamera() {
    console.log('Starting camera...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 300, 
                height: 300,
                facingMode: 'user'
            } 
        });
        
        videoElement.srcObject = stream;
        video = videoElement;
        
        // Load the handpose model
        model = await handpose.load();
        console.log('Handpose model loaded');
        
        // Enable play button
        playButton.disabled = false;
        startButton.textContent = 'Camera On';
        startButton.disabled = true;
        
        // Start prediction loop
        predictGesture();
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera: ' + error.message);
    }
}

// Predict the gesture from the video feed
async function predictGesture() {
    if (!model || !video) return;
    
    try {
        const predictions = await model.estimateHands(video);
        
        if (predictions.length > 0) {
            const gesture = recognizeGesture(predictions[0]);
            playerGestureElement.innerHTML = `<span>${gesture.charAt(0).toUpperCase() + gesture.slice(1)}</span>`;
        } else {
            playerGestureElement.innerHTML = '<span>No hand detected</span>';
        }
        
        // Continue the prediction loop
        if (video.srcObject) {
            requestAnimationFrame(predictGesture);
        }
    } catch (error) {
        console.error('Error in gesture prediction:', error);
    }
}

// Recognize gesture based on hand landmarks
function recognizeGesture(prediction) {
    // Simplified gesture recognition based on finger positions
    const landmarks = prediction.landmarks;
    
    // Get finger states (extended or not)
    const thumbExtended = getFingerState(landmarks, 1, 2, 4);
    const indexFingerExtended = getFingerState(landmarks, 5, 6, 8);
    const middleFingerExtended = getFingerState(landmarks, 9, 10, 12);
    const ringFingerExtended = getFingerState(landmarks, 13, 14, 16);
    const pinkyExtended = getFingerState(landmarks, 17, 18, 20);
    
    // Determine gesture based on which fingers are extended
    if (!indexFingerExtended && !middleFingerExtended && !ringFingerExtended && !pinkyExtended) {
        return gestures.rock; // All fingers curled (fist)
    } else if (indexFingerExtended && middleFingerExtended && ringFingerExtended && pinkyExtended) {
        return gestures.paper; // All fingers extended
    } else if (indexFingerExtended && middleFingerExtended && !ringFingerExtended && !pinkyExtended) {
        return gestures.scissors; // Index and middle finger extended
    } else {
        return gestures.none; // Unclear gesture
    }
}

// Helper function to determine if a finger is extended
function getFingerState(landmarks, base, middle, tip) {
    // Simple check: if tip is higher than base, finger is extended
    return landmarks[tip][1] < landmarks[middle][1] && 
           landmarks[middle][1] < landmarks[base][1];
}

// Play a round of the game
async function playRound() {
    if (!model || !video) {
        alert('Please start the camera first!');
        return;
    }
    
    playing = true;
    playButton.disabled = true;
    
    // Get player gesture
    const predictions = await model.estimateHands(video);
    
    if (predictions.length === 0) {
        resultElement.textContent = "No hand detected! Try again.";
        resultElement.className = "result-display";
        playButton.disabled = false;
        return;
    }
    
    const playerGesture = recognizeGesture(predictions[0]);
    
    if (playerGesture === gestures.none) {
        resultElement.textContent = "Unclear gesture! Try again.";
        resultElement.className = "result-display";
        playButton.disabled = false;
        return;
    }
    
    // Generate computer move
    const computerGesture = generateComputerMove();
    
    // Display computer gesture with animation
    computerGestureElement.classList.add('shake');
    computerMoveElement.textContent = "Choosing...";
    
    // Show computer gesture after delay
    setTimeout(() => {
        computerGestureElement.classList.remove('shake');
        computerGestureElement.innerHTML = getGestureEmoji(computerGesture);
        computerMoveElement.textContent = computerGesture.charAt(0).toUpperCase() + computerGesture.slice(1);
        
        // Determine winner
        const result = determineWinner(playerGesture, computerGesture);
        displayResult(result);
        
        // Update scores
        updateScore(result);
        
        playing = false;
        playButton.disabled = false;
    }, 1000);
}

// Generate computer move
function generateComputerMove() {
    const moves = [gestures.rock, gestures.paper, gestures.scissors];
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
}

// Get emoji for gesture
function getGestureEmoji(gesture) {
    switch(gesture) {
        case gestures.rock: return '✊';
        case gestures.paper: return '✋';
        case gestures.scissors: return '✌️';
        default: return '?';
    }
}

// Determine the winner
function determineWinner(player, computer) {
    if (player === computer) {
        return 'tie';
    }
    
    if (
        (player === gestures.rock && computer === gestures.scissors) ||
        (player === gestures.paper && computer === gestures.rock) ||
        (player === gestures.scissors && computer === gestures.paper)
    ) {
        return 'win';
    }
    
    return 'lose';
}

// Display the result
function displayResult(result) {
    switch(result) {
        case 'win':
            resultElement.textContent = "You Win!";
            resultElement.className = "result-display win";
            break;
        case 'lose':
            resultElement.textContent = "Computer Wins!";
            resultElement.className = "result-display lose";
            break;
        case 'tie':
            resultElement.textContent = "It's a Tie!";
            resultElement.className = "result-display tie";
            break;
    }
}

// Update the score
function updateScore(result) {
    if (result === 'win') {
        playerScore++;
        playerScoreElement.textContent = playerScore;
    } else if (result === 'lose') {
        computerScore++;
        computerScoreElement.textContent = computerScore;
    }
}

// Reset the game
function resetGame() {
    playerScore = 0;
    computerScore = 0;
    playerScoreElement.textContent = '0';
    computerScoreElement.textContent = '0';
    resultElement.textContent = "Make your move!";
    resultElement.className = "result-display";
    computerGestureElement.innerHTML = '<span>?</span>';
    computerMoveElement.textContent = "Waiting...";
    playerGestureElement.innerHTML = '<span>Waiting for gesture...</span>';
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);
