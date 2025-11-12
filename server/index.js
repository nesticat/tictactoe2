const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 게임 상태 관리
const games = new Map(); // gameId -> game state
const clients = new Map(); // ws -> client info

let gameIdCounter = 1;

// AI 플레이어 로직
function getAIMove(board) {
  // Minimax 알고리즘을 사용한 AI
  function minimax(board, depth, isMaximizing) {
    const score = evaluateBoard(board);
    
    if (score === 10) return score - depth;
    if (score === -10) return score + depth;
    
    const emptySquares = board
      .map((val, idx) => val === '' ? idx : null)
      .filter(idx => idx !== null);
    
    if (emptySquares.length === 0) return 0;
    
    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let idx of emptySquares) {
        const newBoard = [...board];
        newBoard[idx] = 'X';
        const score = minimax(newBoard, depth + 1, false);
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let idx of emptySquares) {
        const newBoard = [...board];
        newBoard[idx] = 'O';
        const score = minimax(newBoard, depth + 1, true);
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  }
  
  function evaluateBoard(board) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];
    
    for (let line of lines) {
      const [a, b, c] = line;
      if (board[a] !== '' && board[a] === board[b] && board[b] === board[c]) {
        return board[a] === 'X' ? 10 : -10;
      }
    }
    return 0;
  }
  
  const emptySquares = board
    .map((val, idx) => val === '' ? idx : null)
    .filter(idx => idx !== null);
  
  let bestScore = -Infinity;
  let bestMove = emptySquares[0];
  
  for (let idx of emptySquares) {
    const newBoard = [...board];
    newBoard[idx] = 'X';
    const score = minimax(newBoard, 0, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }
  
  return bestMove;
}

// 게임 상태 확인
function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] !== '' && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every(cell => cell !== '');
}

// 메시지 브로드캐스트
function broadcast(gameId, message) {
  const game = games.get(gameId);
  if (game) {
    game.players.forEach(ws => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

// WebSocket 연결 처리
wss.on('connection', (ws) => {
  console.log('새 클라이언트 연결됨');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'join_game':
          handleJoinGame(ws, message);
          break;
        case 'play_move':
          handlePlayMove(ws, message);
          break;
        case 'rematch':
          handleRematch(ws, message);
          break;
        case 'join_ai':
          handleJoinAI(ws, message);
          break;
      }
    } catch (e) {
      console.error('메시지 처리 오류:', e);
    }
  });
  
  ws.on('close', () => {
    handleClientDisconnect(ws);
  });
});

function handleJoinGame(ws, message) {
  const { symbol, mode } = message;
  
  if (mode === 'multiplayer') {
    // 대기 중인 게임 찾기
    let gameId = null;
    for (const [id, game] of games.entries()) {
      if (game.mode === 'multiplayer' && game.players.length === 1 && game.status === 'waiting') {
        gameId = id;
        break;
      }
    }
    
    // 새 게임 생성
    if (!gameId) {
      gameId = `game_${gameIdCounter++}`;
      games.set(gameId, {
        id: gameId,
        mode: 'multiplayer',
        players: [ws],
        board: Array(9).fill(''),
        currentTurn: 'O',
        symbols: { [ws]: symbol },
        status: 'waiting',
        winner: null
      });
      ws.gameId = gameId;
      ws.send(JSON.stringify({
        type: 'game_created',
        gameId,
        yourSymbol: symbol,
        status: 'waiting_for_opponent',
        board: Array(9).fill('')
      }));
    } else {
      const game = games.get(gameId);
      const opponent = game.players[0];
      const opponentSymbol = game.symbols[opponent];
      const yourSymbol = symbol;
      
      game.players.push(ws);
      game.symbols[ws] = yourSymbol;
      game.status = 'playing';
      
      // 두 플레이어 모두에게 게임 시작 알림
      opponent.send(JSON.stringify({
        type: 'opponent_joined',
        gameId,
        yourSymbol: opponentSymbol,
        opponentSymbol: yourSymbol,
        board: game.board,
        currentTurn: 'O'
      }));
      
      ws.gameId = gameId;
      ws.send(JSON.stringify({
        type: 'game_joined',
        gameId,
        yourSymbol: yourSymbol,
        opponentSymbol: opponentSymbol,
        board: game.board,
        currentTurn: 'O'
      }));
    }
  }
}

function handleJoinAI(ws, message) {
  const { symbol } = message;
  const gameId = `game_ai_${gameIdCounter++}`;
  const playerSymbol = symbol;
  const aiSymbol = symbol === 'O' ? 'X' : 'O';
  
  games.set(gameId, {
    id: gameId,
    mode: 'ai',
    players: [ws],
    board: Array(9).fill(''),
    currentTurn: 'O',
    playerSymbol,
    aiSymbol,
    status: 'playing',
    winner: null
  });
  
  ws.gameId = gameId;
  ws.send(JSON.stringify({
    type: 'ai_game_started',
    gameId,
    yourSymbol: playerSymbol,
    aiSymbol,
    board: Array(9).fill(''),
    currentTurn: 'O'
  }));
}

function handlePlayMove(ws, message) {
  const { gameId, position } = message;
  const game = games.get(gameId);
  
  if (!game || game.winner) return;
  
  if (game.mode === 'multiplayer') {
    const playerSymbol = game.symbols[ws];
    
    // 플레이어의 턴 확인
    if (game.currentTurn !== playerSymbol) return;
    
    // 유효한 움직임 확인
    if (game.board[position] !== '') return;
    
    game.board[position] = playerSymbol;
    const winner = checkWinner(game.board);
    
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
      broadcast(gameId, {
        type: 'game_end',
        board: game.board,
        winner: winner,
        message: `${winner} 승리!`
      });
    } else if (isBoardFull(game.board)) {
      game.status = 'finished';
      broadcast(gameId, {
        type: 'game_end',
        board: game.board,
        winner: null,
        message: '무승부'
      });
    } else {
      game.currentTurn = game.currentTurn === 'O' ? 'X' : 'O';
      broadcast(gameId, {
        type: 'move_made',
        board: game.board,
        currentTurn: game.currentTurn,
        position
      });
    }
  } else if (game.mode === 'ai') {
    // AI 게임
    if (game.board[position] !== '') return;
    
    game.board[position] = game.playerSymbol;
    let winner = checkWinner(game.board);
    
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
      ws.send(JSON.stringify({
        type: 'game_end',
        board: game.board,
        winner: winner,
        message: `${winner} 승리!`
      }));
      return;
    }
    
    if (isBoardFull(game.board)) {
      game.status = 'finished';
      ws.send(JSON.stringify({
        type: 'game_end',
        board: game.board,
        winner: null,
        message: '무승부'
      }));
      return;
    }
    
    // AI 턴
    const aiMove = getAIMove(game.board);
    game.board[aiMove] = game.aiSymbol;
    winner = checkWinner(game.board);
    
    if (winner) {
      game.winner = winner;
      game.status = 'finished';
      ws.send(JSON.stringify({
        type: 'game_end',
        board: game.board,
        winner: winner,
        message: `${winner} 승리!`
      }));
    } else if (isBoardFull(game.board)) {
      game.status = 'finished';
      ws.send(JSON.stringify({
        type: 'game_end',
        board: game.board,
        winner: null,
        message: '무승부'
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'move_made',
        board: game.board,
        aiMove: aiMove,
        currentTurn: game.playerSymbol
      }));
    }
  }
}

function handleRematch(ws, message) {
  const { gameId } = message;
  const game = games.get(gameId);
  
  if (!game) return;
  
  if (game.mode === 'multiplayer') {
    game.board = Array(9).fill('');
    game.currentTurn = 'O';
    game.winner = null;
    game.status = 'playing';
    
    broadcast(gameId, {
      type: 'rematch_started',
      board: game.board,
      currentTurn: game.currentTurn
    });
  } else if (game.mode === 'ai') {
    game.board = Array(9).fill('');
    game.currentTurn = 'O';
    game.winner = null;
    game.status = 'playing';
    
    ws.send(JSON.stringify({
      type: 'rematch_started',
      board: game.board,
      currentTurn: game.currentTurn
    }));
  }
}

function handleClientDisconnect(ws) {
  if (ws.gameId) {
    const game = games.get(ws.gameId);
    if (game && game.mode === 'multiplayer') {
      const opponent = game.players.find(p => p !== ws);
      if (opponent && opponent.readyState === WebSocket.OPEN) {
        opponent.send(JSON.stringify({
          type: 'opponent_disconnected',
          message: '상대가 연결을 해제했습니다'
        }));
      }
      games.delete(ws.gameId);
    }
  }
  console.log('클라이언트 연결 해제');
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});
