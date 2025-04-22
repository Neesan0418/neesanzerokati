// script.js - Complete Code
const cells = document.querySelectorAll('.cell');
const statusDiv = document.getElementById('status');
const tapSound = document.getElementById('tapSound');
const winSound = document.getElementById('winSound');
const loseSound = document.getElementById('loseSound');
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const difficultySelect = document.getElementById('difficultySelect');
const scoreDisplay = document.getElementById('scoreDisplay');
const moveHistoryDisplay = document.getElementById('moveHistory');
const timerDisplay = document.getElementById('timer');
const timerToggle = document.getElementById('timerToggle');
const modeChangeModal = document.getElementById('modeChangeModal');

// Game State Variables
let board = Array(9).fill("");
let currentPlayer = 'A';
let gameActive = true;
let mode = '2p';
let difficulty = 'medium';
let inactivityTimer;
const INACTIVITY_LIMIT = 10000;
let scores = { A: 0, B: 0, draws: 0 };
let gameHistory = [];
let timerEnabled = true;
let moveTimer = 10;
let timerInterval;
let firstMoveMade = false;
let pendingChange = { type: null, value: null };

const moveHistory = {
  A: [],
  B: []
};

// Event Listeners Setup
function initializeEventListeners() {
  document.querySelector('.dark-mode-toggle').addEventListener('click', toggleDarkMode);
  
  document.querySelectorAll('input[name="mode"]').forEach(input => {
    input.addEventListener('change', (e) => confirmModeChange(e.target.value));
  });

  document.querySelectorAll('input[name="difficulty"]').forEach(input => {
    input.addEventListener('change', (e) => confirmDifficultyChange(e.target.value));
  });

  document.querySelector('.restart').addEventListener('click', confirmRestart);
  document.getElementById('timerToggle').addEventListener('click', toggleTimer);

  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  document.addEventListener('mousemove', resetInactivityTimer);
  document.addEventListener('keypress', resetInactivityTimer);
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Timer Functions
function toggleTimer() {
  timerEnabled = !timerEnabled;
  timerToggle.textContent = `Timer: ${timerEnabled ? 'ON' : 'OFF'}`;
  if (timerEnabled && mode === '2p' && firstMoveMade) startTimer();
  else clearInterval(timerInterval);
}

function startTimer() {
  clearInterval(timerInterval);
  moveTimer = 10;
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    moveTimer--;
    updateTimerDisplay();
    if (moveTimer <= 0) {
      clearInterval(timerInterval);
      autoMove();
    }
  }, 1000);
}

function updateTimerDisplay() {
  timerDisplay.textContent = `Time: ${moveTimer}s`;
  timerDisplay.style.color = moveTimer <= 3 ? '#ff0000' : 
                           moveTimer <= 5 ? '#ff5722' : '#4CAF50';
}

// Game Logic
function handleCellClick(e) {
  const idx = +e.target.id.replace('cell', '');
  if (!gameActive || board[idx]) return;

  makeMove(idx);
  const result = checkWin();
  
  if (result) {
    endGame(result);
  } else {
    switchPlayer();
    if (mode === '1p' && currentPlayer === 'B') {
      setTimeout(computerMove, 300 + Math.random() * 400);
    }
  }
}

function makeMove(index) {
  saveToHistory();
  board[index] = currentPlayer;
  cells[index].textContent = currentPlayer === 'A' ? 'X' : 'O';
  cells[index].disabled = true;
  
  moveHistory[currentPlayer].push(index);
  if (moveHistory[currentPlayer].length > 3) {
    const oldestMove = moveHistory[currentPlayer].shift();
    resetCell(oldestMove);
  }

  playSound(tapSound);
  resetInactivityTimer();
  updateBoard();
}

function checkWin() {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (const pattern of winPatterns) {
    const [a,b,c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], pattern };
    }
  }
  return board.includes("") ? null : { winner: "Draw" };
}

// Computer AI
function computerMove() {
  let move;
  switch(difficulty) {
    case 'easy': move = easyComputerMove(); break;
    case 'hard': move = hardComputerMove(); break;
    default: move = mediumComputerMove();
  }

  if (move !== -1) {
    makeMove(move);
    const result = checkWin();
    if (result) endGame(result);
    else currentPlayer = 'A';
  }
}

function easyComputerMove() {
  const emptyCells = [];
  board.forEach((cell, index) => {
    if (!cell) emptyCells.push(index);
  });
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function mediumComputerMove() {
  // Win if possible
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'B';
      if (checkWin()?.winner === 'B') {
        board[i] = "";
        return i;
      }
      board[i] = "";
    }
  }

  // Block player from winning
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'A';
      if (checkWin()?.winner === 'A') {
        board[i] = "";
        return i;
      }
      board[i] = "";
    }
  }

  return easyComputerMove();
}

function minimax(board, depth, isMaximizing) {
  const result = checkWin();
  if (result) {
    if (result.winner === 'B') return 10 - depth;
    if (result.winner === 'A') return depth - 10;
    return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'B';
        const score = minimax(board, depth + 1, false);
        board[i] = "";
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'A';
        const score = minimax(board, depth + 1, true);
        board[i] = "";
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

function hardComputerMove() {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'B';
      let score = minimax(board, 0, false);
      board[i] = "";
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

// Game Utilities
function playSound(sound) {
  try {
    sound.currentTime = 0;
    sound.play();
  } catch (e) {
    console.error("Error playing sound:", e);
  }
}

function updateBoard() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index] === 'A' ? 'X' : board[index] === 'B' ? 'O' : '';
    cell.disabled = !!board[index];
  });
  updateCellColors();
}

function updateCellColors() {
  cells.forEach(cell => {
    cell.classList.remove('x-turn', 'o-turn');
    if (!cell.disabled) {
      cell.classList.add(currentPlayer === 'A' ? 'x-turn' : 'o-turn');
    }
  });
}

// Initialization
function initializeGame() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }
  setMode('2p');
  updateCellColors();
  updateMoveHistory();
  resetInactivityTimer();
  initializeEventListeners();
}

// Start the Game
initializeGame();