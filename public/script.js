// 게임 상태
let gameState = {
  ws: null,
  gameId: null,
  mode: null, // 'multiplayer' 또는 'ai'
  yourSymbol: null,
  opponentSymbol: null,
  board: Array(9).fill(''),
  currentTurn: 'O',
  gameActive: false,
  isWaiting: false
};

// WebSocket 연결
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  gameState.ws = new WebSocket(`${protocol}//${window.location.host}`);
  
  gameState.ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };
  
  gameState.ws.onclose = () => {
    console.log('WebSocket 연결이 끊겼습니다');
    // 자동 재연결
    setTimeout(connectWebSocket, 3000);
  };
  
  gameState.ws.onerror = (error) => {
    console.error('WebSocket 오류:', error);
  };
}

// 메시지 처리
function handleMessage(message) {
  switch (message.type) {
    case 'game_created':
      handleGameCreated(message);
      break;
    case 'opponent_joined':
      handleOpponentJoined(message);
      break;
    case 'game_joined':
      handleGameJoined(message);
      break;
    case 'move_made':
      handleMoveMade(message);
      break;
    case 'game_end':
      handleGameEnd(message);
      break;
    case 'rematch_started':
      handleRematchStarted(message);
      break;
    case 'opponent_disconnected':
      handleOpponentDisconnected(message);
      break;
    case 'ai_game_started':
      handleAIGameStarted(message);
      break;
  }
}

function handleGameCreated(message) {
  gameState.gameId = message.gameId;
  gameState.mode = 'multiplayer';
  gameState.yourSymbol = message.yourSymbol;
  gameState.board = message.board;
  gameState.currentTurn = message.currentTurn;
  gameState.isWaiting = true;
  
  showScreen('waitingScreen');
  document.getElementById('gameIdDisplay').textContent = gameState.gameId;
}

function handleOpponentJoined(message) {
  gameState.gameId = message.gameId;
  gameState.yourSymbol = message.yourSymbol;
  gameState.opponentSymbol = message.opponentSymbol;
  gameState.board = message.board;
  gameState.currentTurn = message.currentTurn;
  gameState.gameActive = true;
  gameState.isWaiting = false;
  
  startGame();
}

function handleGameJoined(message) {
  gameState.gameId = message.gameId;
  gameState.yourSymbol = message.yourSymbol;
  gameState.opponentSymbol = message.opponentSymbol;
  gameState.board = message.board;
  gameState.currentTurn = message.currentTurn;
  gameState.gameActive = true;
  gameState.isWaiting = false;
  
  startGame();
}

function handleAIGameStarted(message) {
  gameState.gameId = message.gameId;
  gameState.mode = 'ai';
  gameState.yourSymbol = message.yourSymbol;
  gameState.opponentSymbol = message.aiSymbol;
  gameState.board = message.board;
  gameState.currentTurn = message.currentTurn;
  gameState.gameActive = true;
  gameState.isWaiting = false;
  
  startGame();
}

function handleMoveMade(message) {
  gameState.board = message.board;
  
  if (message.currentTurn !== undefined) {
    gameState.currentTurn = message.currentTurn;
  }
  
  if (gameState.mode === 'ai' && message.aiMove !== undefined) {
    // AI 이동 후 - 사용자 차례로 설정
    gameState.currentTurn = gameState.yourSymbol;
  }
  
  updateBoard();
  updateStatus();
}

function handleGameEnd(message) {
  gameState.board = message.board;
  gameState.gameActive = false;
  
  updateBoard();
  
  const resultContainer = document.getElementById('resultContainer');
  const resultMessage = document.getElementById('resultMessage');
  
  if (message.winner) {
    if (gameState.mode === 'multiplayer') {
      if (message.winner === gameState.yourSymbol) {
        resultMessage.textContent = `축하합니다! 당신 (${message.winner})이(가) 승리했습니다!`;
      } else {
        resultMessage.textContent = `상대 (${message.winner})이(가) 승리했습니다!`;
      }
    } else if (gameState.mode === 'ai') {
      if (message.winner === gameState.yourSymbol) {
        resultMessage.textContent = `축하합니다! 당신 (${message.winner})이(가) AI를 이겼습니다!`;
      } else {
        resultMessage.textContent = `AI (${message.winner})가 승리했습니다!`;
      }
    }
  } else {
    resultMessage.textContent = '무승부입니다!';
  }
  
  resultContainer.style.display = 'flex';
}

function handleRematchStarted(message) {
  gameState.board = message.board;
  gameState.currentTurn = message.currentTurn;
  gameState.gameActive = true;
  
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.style.display = 'none';
  
  updateBoard();
  updateStatus();
}

function handleOpponentDisconnected(message) {
  gameState.gameActive = false;
  alert(message.message);
  backToMenu();
}

// UI 함수들
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

function showMultiplayerMenu() {
  showScreen('multiplayerScreen');
}

function showAIMenu() {
  showScreen('aiScreen');
}

function backToMenu() {
  gameState = {
    ws: gameState.ws,
    gameId: null,
    mode: null,
    yourSymbol: null,
    opponentSymbol: null,
    board: Array(9).fill(''),
    currentTurn: 'O',
    gameActive: false,
    isWaiting: false
  };
  
  const resultContainer = document.getElementById('resultContainer');
  resultContainer.style.display = 'none';
  
  showScreen('menuScreen');
}

function joinMultiplayer(symbol) {
  if (!gameState.ws) connectWebSocket();
  
  gameState.ws.send(JSON.stringify({
    type: 'join_game',
    symbol: symbol,
    mode: 'multiplayer'
  }));
}

function joinAI(symbol) {
  if (!gameState.ws) connectWebSocket();
  
  gameState.ws.send(JSON.stringify({
    type: 'join_ai',
    symbol: symbol
  }));
}

function startGame() {
  showScreen('gameScreen');
  document.getElementById('currentGameId').textContent = gameState.gameId;
  
  if (gameState.mode === 'multiplayer') {
    document.getElementById('modeInfo').textContent = '모드: 멀티플레이 (온라인)';
  } else {
    document.getElementById('modeInfo').textContent = '모드: AI와 플레이';
  }
  
  updatePlayerInfo();
  updateBoard();
  updateStatus();
}

function updatePlayerInfo() {
  const playerSymbols = document.getElementById('playerSymbols');
  
  if (gameState.mode === 'multiplayer') {
    playerSymbols.textContent = `당신: ${gameState.yourSymbol} | 상대: ${gameState.opponentSymbol}`;
  } else {
    playerSymbols.textContent = `당신: ${gameState.yourSymbol} | AI: ${gameState.opponentSymbol}`;
  }
}

function updateBoard() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    const value = gameState.board[index];
    cell.textContent = value;
    cell.classList.toggle('filled', value !== '');
    
    // 색상 구분
    if (value === 'O') {
      cell.style.color = '#667eea';
    } else if (value === 'X') {
      cell.style.color = '#764ba2';
    }
  });
}

function updateStatus() {
  const statusEl = document.getElementById('gameStatus');
  const turnEl = document.getElementById('currentTurn');
  
  if (gameState.gameActive) {
    statusEl.textContent = '게임 진행 중';
    statusEl.style.color = '#28a745';
    
    if (gameState.currentTurn === gameState.yourSymbol) {
      turnEl.textContent = '당신의 차례';
      turnEl.style.color = '#ffc107';
    } else if (gameState.mode === 'multiplayer') {
      turnEl.textContent = '상대의 차례';
      turnEl.style.color = '#dc3545';
    } else {
      turnEl.textContent = 'AI의 차례';
      turnEl.style.color = '#dc3545';
    }
  } else if (gameState.isWaiting) {
    statusEl.textContent = '대기 중';
    statusEl.style.color = '#0066cc';
    turnEl.textContent = '상대 입장 대기';
  } else {
    statusEl.textContent = '준비 중';
    statusEl.style.color = '#666';
    turnEl.textContent = '-';
  }
}

function makeMove(position) {
  if (!gameState.gameActive) return;
  if (gameState.board[position] !== '') return;
  
  // 자신의 차례가 아니면 무시
  if (gameState.currentTurn !== gameState.yourSymbol) return;
  
  gameState.ws.send(JSON.stringify({
    type: 'play_move',
    gameId: gameState.gameId,
    position: position
  }));
}

function rematch() {
  if (!gameState.gameActive && gameState.gameId) {
    gameState.ws.send(JSON.stringify({
      type: 'rematch',
      gameId: gameState.gameId
    }));
  }
}

// 초기화
window.addEventListener('load', () => {
  showScreen('menuScreen');
  connectWebSocket();
});

// 페이지를 떠날 때 WebSocket 정리
window.addEventListener('beforeunload', () => {
  if (gameState.ws) {
    gameState.ws.close();
  }
});
