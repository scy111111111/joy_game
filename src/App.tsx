import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { soundService } from './SoundService';
import { message } from 'antd';

// 玩家信息
const PLAYERS = [
  { 
    name: "京东", 
    color: "#EA352A",
    image: "https://p0.itc.cn/images01/20230318/2e7041028cb546c6b5d18f2ed215a638.gif"
  },
  { 
    name: "美团", 
    color: "#FFD400",
    image: "https://res.shaoxing.com.cn/a/10001/202303/f6d829ae32aa0ed103b93777b7f931a2.gif"
  },
  { 
    name: "饿了么", 
    color: "#1296DB",
    image: "https://5b0988e595225.cdn.sohucs.com/images/20200205/db8825682a2c4e6b89c813d8fdc065ba.gif"
  }
];

// 玩家状态
type PlayerStatus = 'active' | 'eliminated';

// 游戏难度级别
type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';

// 难度配置
const DIFFICULTY_CONFIG = {
  beginner: {
    rows: 8,
    cols: 8,
    mines: 10,
    color: '#c0dcc0', // 浅绿色背景
    aiRandomFactor: 0.9, // AI更容易选择安全格子
    name: '初级'
  },
  intermediate: {
    rows: 16,
    cols: 16,
    mines: 40,
    color: '#c0c0dc', // 浅蓝色背景
    aiRandomFactor: 0.5, // 平衡的随机性
    name: '中级'
  },
  expert: {
    rows: 16,
    cols: 30,
    mines: 99,
    color: '#dcc0c0', // 浅红色背景
    aiRandomFactor: 0.2, // AI更容易冒险
    name: '高级'
  }
};

type Cell = {
  opened: boolean;
  flagged: boolean;
  mine: boolean;
  adjacent: number;
  owner?: number; // 归属玩家标识
};

function generateBoard(rows: number, cols: number, mineCount: number): Cell[][] {
  // 初始化空棋盘
  const board: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      opened: false,
      flagged: false,
      mine: false,
      adjacent: 0,
    }))
  );
  // 随机埋雷
  let mines = mineCount;
  while (mines > 0) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      mines--;
    }
  }
  // 计算相邻雷数
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

// 历史战绩类型定义
type GameRecord = {
  id: number;
  date: string;
  winners: number[];
  scores: number[];
  predicted: number | null;
  predictCorrect: boolean;
  rounds: number;
};

function App() {
  // 难度选择状态
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [showRewardMessage, setShowRewardMessage] = useState(false);
  
  // 获取当前难度配置
  const currentConfig = DIFFICULTY_CONFIG[difficulty];
  
  const [board, setBoard] = useState<Cell[][]>(
    generateBoard(currentConfig.rows, currentConfig.cols, currentConfig.mines)
  );
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0:京东, 1:美团, 2:饿了么
  const [scores, setScores] = useState<number[]>([0, 0, 0]);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus[]>(['active', 'active', 'active']);
  const [gameOver, setGameOver] = useState(false);
  const [rounds, setRounds] = useState(0); // 记录回合数
  const [winners, setWinners] = useState<number[]>([]);

  // 预测赢家界面状态
  const [predicting, setPredicting] = useState(true);
  const [predicted, setPredicted] = useState<number | null>(null);
  
  // 历史战绩状态
  const [showHistory, setShowHistory] = useState(false);
  const [gameRecords, setGameRecords] = useState<GameRecord[]>([]);
  
  // 动画控制状态
  const [lastOpenedCell, setLastOpenedCell] = useState<{row: number, col: number} | null>(null);
  
  // 音效状态
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 加载历史战绩
  useEffect(() => {
    const savedRecords = localStorage.getItem('minesweeper-records');
    if (savedRecords) {
      try {
        setGameRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error('Failed to parse saved records', e);
      }
    }
  }, []);

  // 保存战绩记录
  const saveGameRecord = useCallback((gameWinners: number[]) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const predictCorrect = predicted !== null && gameWinners.includes(predicted);
    
    // 播放胜利或失败音效
    if (predicted !== null) {
      if (predictCorrect) {
        soundService.play('win');
      } else {
        soundService.play('lose');
      }
    }
    
    const newRecord: GameRecord = {
      id: Date.now(),
      date: dateStr,
      winners: gameWinners,
      scores: [...scores],
      predicted,
      predictCorrect,
      rounds
    };
    
    const updatedRecords = [newRecord, ...gameRecords].slice(0, 10); // 只保留最近10条记录
    setGameRecords(updatedRecords);
    localStorage.setItem('minesweeper-records', JSON.stringify(updatedRecords));
  }, [gameRecords, predicted, scores, rounds]);

  // 获取下一个活跃玩家
  const getNextActivePlayer = useCallback((current: number) => {
    let next = (current + 1) % PLAYERS.length;
    let count = 0;
    
    // 寻找下一个活跃玩家，最多循环一圈
    while (playerStatus[next] === 'eliminated' && count < PLAYERS.length) {
      next = (next + 1) % PLAYERS.length;
      count++;
    }
    
    return next;
  }, [playerStatus]);
  
  // 计算胜利者
  const calculateWinners = useCallback(() => {
    // 检查是否只剩一个活跃玩家（其他都被淘汰）
    const activePlayers = playerStatus
      .map((status, idx) => status === 'active' ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (activePlayers.length === 1) {
      // 如果只剩一个活跃玩家，它就是胜利者
      return activePlayers;
    } else if (activePlayers.length > 1) {
      // 如果有多个活跃玩家，比较他们的得分
      const activeScores = activePlayers.map(idx => scores[idx]);
      const maxActiveScore = Math.max(...activeScores);
      return activePlayers.filter(idx => scores[idx] === maxActiveScore);
    } else {
      // 如果所有玩家都被淘汰，比较所有玩家的得分
      const maxScore = Math.max(...scores);
      return scores
        .map((s, i) => (s === maxScore ? i : -1))
        .filter(i => i !== -1);
    }
  }, [playerStatus, scores]);
  
  // 检查游戏是否结束（只剩一个活跃玩家或所有安全格子都被打开）
  const checkGameOver = useCallback(() => {
    // 计算活跃玩家数量
    const activePlayers = playerStatus.filter(status => status === 'active').length;
    
    // 如果只剩一个活跃玩家，游戏结束
    if (activePlayers <= 1) {
      return true;
    }
    
    // 检查是否所有安全格子都被打开
    const unopenedSafeCells = board.flat().filter(cell => !cell.opened && !cell.mine).length;
    return unopenedSafeCells === 0;
  }, [board, playerStatus]);

  // 递归展开空白区域
  const expandEmptyCells = (
    boardCopy: Cell[][],
    r: number,
    c: number,
    currentPlayerIndex: number,
    scoreIncrement: number[]
  ) => {
    const { rows, cols } = currentConfig;
    
    // 如果超出边界或已经打开，则返回
    if (r < 0 || r >= rows || c < 0 || c >= cols || boardCopy[r][c].opened) {
      return;
    }
    
    // 如果是雷，不展开
    if (boardCopy[r][c].mine) {
      return;
    }
    
    // 打开当前格子
    if (!boardCopy[r][c].opened) {
      boardCopy[r][c].opened = true;
      boardCopy[r][c].owner = currentPlayerIndex;
      scoreIncrement[currentPlayerIndex]++;
    }
    
    // 如果周围有雷，不继续展开
    if (boardCopy[r][c].adjacent > 0) {
      return;
    }
    
    // 递归展开周围的8个格子
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue; // 跳过自身
        expandEmptyCells(boardCopy, r + dr, c + dc, currentPlayerIndex, scoreIncrement);
      }
    }
  };

  // 自动AI轮流开格子
  useEffect(() => {
    if (gameOver || predicting) return;
    
    // 如果当前玩家已被淘汰，切换到下一个活跃玩家
    if (playerStatus[currentPlayer] === 'eliminated') {
      setCurrentPlayer(getNextActivePlayer(currentPlayer));
      return;
    }
    
    const timer = setTimeout(() => {
      setRounds(prev => prev + 1); // 增加回合计数
      let moved = false;
      const newBoard = board.map(row => row.slice());
      const newPlayerStatus = [...playerStatus];
      const scoreIncrement = [0, 0, 0]; // 记录每个玩家的得分增量
      
      const { rows, cols, aiRandomFactor } = currentConfig;
      
      // 获取所有未打开的格子
      const unopenedCells: {row: number, col: number}[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!newBoard[r][c].opened && !newBoard[r][c].flagged) {
            unopenedCells.push({row: r, col: c});
          }
        }
      }
      
      // 如果没有未打开的格子，直接返回
      if (unopenedCells.length === 0) {
        const gameWinners = calculateWinners();
        setWinners(gameWinners);
        setGameOver(true);
        saveGameRecord(gameWinners);
        return;
      }
      
      // 根据难度级别调整AI决策策略
      let selectedCell;
      
      // 使用aiRandomFactor来影响AI决策
      // 较高的aiRandomFactor值会使AI更倾向于选择安全的格子
      if (Math.random() < aiRandomFactor) {
        // 尝试做出更智能的决策（初级难度更容易选择安全格子）
        // 简单策略：将格子分为边缘和非边缘，边缘格子更可能是雷
        const saferCells = unopenedCells.filter(cell => {
          const { row, col } = cell;
          // 判断是否为边缘格子（靠近棋盘边缘的格子）
          return row > 1 && row < rows - 2 && col > 1 && col < cols - 2;
        });
        
        // 如果有更安全的格子可选，从中随机选择一个
        if (saferCells.length > 0) {
          const safeIndex = Math.floor(Math.random() * saferCells.length);
          selectedCell = saferCells[safeIndex];
        } else {
          // 如果没有更安全的格子，随机选择
          const randomIndex = Math.floor(Math.random() * unopenedCells.length);
          selectedCell = unopenedCells[randomIndex];
        }
      } else {
        // 完全随机选择（高级难度更容易这样选择）
        const randomIndex = Math.floor(Math.random() * unopenedCells.length);
        selectedCell = unopenedCells[randomIndex];
      }
      
      const selectedRow = selectedCell.row;
      const selectedCol = selectedCell.col;
      
      if (!newBoard[selectedRow][selectedCol].mine) {
        // 如果不是雷，递归展开空白区域
        expandEmptyCells(newBoard, selectedRow, selectedCol, currentPlayer, scoreIncrement);
        
        // 更新得分
        setScores(s => {
          const next = [...s];
          next[currentPlayer] += scoreIncrement[currentPlayer];
          return next;
        });
        
        // 播放打开安全格子的音效
        soundService.play('open');
        
        moved = true;
      } else {
        // 如果是雷，当前玩家被淘汰
        newBoard[selectedRow][selectedCol].opened = true;
        newBoard[selectedRow][selectedCol].owner = currentPlayer;
        newPlayerStatus[currentPlayer] = 'eliminated';
        setPlayerStatus(newPlayerStatus);
        
        // 播放踩雷音效
        soundService.play('mine');
        
        moved = true;
      }
      
      // 记录最后打开的格子位置，用于动画效果
      if (selectedRow !== -1 && selectedCol !== -1) {
        setLastOpenedCell({row: selectedRow, col: selectedCol});
      }
      
      setBoard(newBoard);
      
      // 检查游戏是否结束
      const isGameOver = checkGameOver() || newPlayerStatus.filter(status => status === 'active').length === 0;
      if (isGameOver) {
        const gameWinners = calculateWinners();
        setWinners(gameWinners);
        setGameOver(true);
        saveGameRecord(gameWinners);
      } else if (moved) {
        // 如果游戏未结束，切换到下一个活跃玩家
        setCurrentPlayer(getNextActivePlayer(currentPlayer));
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [board, currentPlayer, gameOver, predicting, playerStatus, getNextActivePlayer, checkGameOver, calculateWinners, saveGameRecord]);

      // 判断是否通关
  useEffect(() => {
    if (gameOver || predicting) return;
    const { rows, cols, mines } = currentConfig;
    const opened = board.flat().filter(cell => cell.opened).length;
    if (opened >= rows * cols - mines) {
      const gameWinners = calculateWinners();
      setWinners(gameWinners);
      setGameOver(true);
      saveGameRecord(gameWinners);
      
      // 检查用户预测是否正确
      if (predicted !== null && gameWinners.includes(predicted)) {
        setShowRewardMessage(true);
        message.success('恭喜你获得京豆🫘1个！', 3);
      }
    }
  }, [board, gameOver, predicting, calculateWinners, saveGameRecord, currentConfig, predicted]);

  // 重开一局
  const handleRestart = () => {
    soundService.play('click');
    setBoard(generateBoard(currentConfig.rows, currentConfig.cols, currentConfig.mines));
    setScores([0, 0, 0]);
    setPlayerStatus(['active', 'active', 'active']);
    setCurrentPlayer(0);
    setGameOver(false);
    setPredicting(true);
    setPredicted(null);
    setRounds(0);
    setLastOpenedCell(null);
    setWinners([]);
  };
  
  // 切换难度
  const handleChangeDifficulty = (level: DifficultyLevel) => {
    soundService.play('click');
    setDifficulty(level);
    setShowDifficultySelect(false);
    // 重新开始游戏
    setBoard(generateBoard(DIFFICULTY_CONFIG[level].rows, DIFFICULTY_CONFIG[level].cols, DIFFICULTY_CONFIG[level].mines));
    setScores([0, 0, 0]);
    setPlayerStatus(['active', 'active', 'active']);
    setCurrentPlayer(0);
    setGameOver(false);
    setPredicting(true);
    setPredicted(null);
    setRounds(0);
    setLastOpenedCell(null);
    setWinners([]);
  };

  // 预测弹窗提交
  const handlePredict = (idx: number) => {
    soundService.play('predict');
    setPredicted(idx);
    setTimeout(() => setPredicting(false), 400);
  };

  // 清空历史战绩
  const handleClearHistory = () => {
    soundService.play('click');
    if (confirm('确定要清空所有历史战绩吗？')) {
      setGameRecords([]);
      localStorage.removeItem('minesweeper-records');
    }
  };
  
  // 切换音效
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundService.setEnabled(newState);
    if (newState) {
      soundService.play('click');
    }
  };

  // 居中弹窗样式
  return (
    <div className="container root-centered">
      {showRewardMessage && (
        <div className="reward-modal">
          <div className="reward-box">
            <h3>🎉 恭喜你！</h3>
            <p>预测成功，获得京豆🫘1个！</p>
            <button onClick={() => setShowRewardMessage(false)}>确定</button>
          </div>
        </div>
      )}
      {predicting && (
        <div className="predict-modal">
          <div className="predict-box">
            <div className="predict-title">请选择你预测会赢的AI玩家</div>
            <div className="predict-choices">
              {PLAYERS.map((p, idx) => (
                <button
                  key={p.name}
                  className="predict-choice"
                  style={{ borderColor: p.color, color: p.color }}
                  onClick={() => handlePredict(idx)}
                >
                  <img src={p.image} alt={p.name} className="player-image-small" />
                </button>
              ))}
            </div>
            {predicted !== null && (
              <div className="predict-selected">
                你选择了：<img src={PLAYERS[predicted].image} alt={PLAYERS[predicted].name} className="player-image-tiny" style={{ background: PLAYERS[predicted].color }} />
              </div>
            )}
          </div>
        </div>
      )}
      {showHistory && (
        <div className="history-modal">
          <div className="history-box">
            <div className="history-header">
              <h3>历史战绩</h3>
              <button className="close-btn" onClick={() => {
                soundService.play('click');
                setShowHistory(false);
              }}>×</button>
            </div>
            
            <div className="history-stats">
              <div className="stat-item">
                <div className="stat-label">
                  <span>总场次</span>
                </div>
                <div className="stat-value">{gameRecords.length}</div>
              </div>
              {PLAYERS.map((player, idx) => {
                const wins = gameRecords.filter(r => r.winners.includes(idx)).length;
                return (
                  <div key={player.name} className="stat-item colored-bg" style={{background: player.color}}>
                    <div className="stat-label">
                      <img src={player.image} alt={player.name} className="player-image-tiny" />
                      <span>胜场</span>
                    </div>
                    <div className="stat-value">{wins}</div>
                  </div>
                );
              })}
              <div className="stat-item">
                <div className="stat-label">
                  <span>预测正确</span>
                </div>
                <div className="stat-value">
                  {gameRecords.filter(r => r.predictCorrect).length}/{gameRecords.filter(r => r.predicted !== null).length}
                </div>
              </div>
            </div>
            
            <div className="history-records">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>胜利者</th>
                    <th>回合</th>
                    <th>预测</th>
                  </tr>
                </thead>
                <tbody>
                  {gameRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="no-records">暂无战绩记录</td>
                    </tr>
                  ) : (
                    gameRecords.map(record => (
                      <tr key={record.id}>
                        <td>{record.date}</td>
                        <td>
                          {record.winners.map(w => (
                            <img 
                              key={w} 
                              src={PLAYERS[w].image} 
                              alt={PLAYERS[w].name} 
                              className="player-image-tiny" 
                              style={{background: PLAYERS[w].color}}
                            />
                          ))}
                        </td>
                        <td>{record.rounds}</td>
                        <td>
                          {record.predicted !== null ? (
                            <span style={{color: record.predictCorrect ? '#67C23A' : '#F56C6C'}}>
                              <img 
                                src={PLAYERS[record.predicted].image} 
                                alt={PLAYERS[record.predicted].name} 
                                className="player-image-tiny" 
                                style={{background: PLAYERS[record.predicted].color}}
                              />
                              {record.predictCorrect ? ' ✓' : ' ✗'}
                            </span>
                          ) : '未预测'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {gameRecords.length > 0 && (
              <button className="clear-history-btn" onClick={handleClearHistory}>
                清空历史记录
              </button>
            )}
          </div>
        </div>
      )}

      {showDifficultySelect && (
        <div className="predict-modal">
          <div className="predict-box">
            <div className="predict-title">选择游戏难度</div>
            <div className="predict-choices difficulty-choices">
              {(Object.keys(DIFFICULTY_CONFIG) as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  className="predict-choice"
                  style={{ 
                    background: DIFFICULTY_CONFIG[level].color,
                    color: '#000',
                    padding: '10px 15px',
                    margin: '0 10px',
                    fontWeight: difficulty === level ? 'bold' : 'normal',
                    border: difficulty === level ? '3px solid #333' : '2px solid #808080'
                  }}
                  onClick={() => handleChangeDifficulty(level)}
                >
                  {DIFFICULTY_CONFIG[level].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <h2 className="title">
        AI 扫雷对战 - {currentConfig.name}
        <button 
          className="difficulty-btn" 
          onClick={() => {
            soundService.play('click');
            setShowDifficultySelect(true);
          }}
          title="选择难度"
          style={{
            marginLeft: '10px',
            background: currentConfig.color,
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          🎮
        </button>
        <button 
          className="history-btn" 
          onClick={() => {
            soundService.play('click');
            setShowHistory(true);
          }}
          title="查看历史战绩"
          style={{
            marginLeft: '10px',
            background: '#c0c0c0',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          📊
        </button>
        <button 
          className="sound-btn" 
          onClick={toggleSound}
          title={soundEnabled ? "关闭音效" : "开启音效"}
          style={{
            marginLeft: '10px',
            background: '#c0c0c0',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </h2>
      <div className="players">
        {PLAYERS.map((p, idx) => (
          <div
            key={p.name}
            className={`player${currentPlayer === idx && !gameOver ? " active" : ""}${playerStatus[idx] === 'eliminated' ? " eliminated" : ""}`}
            style={{ borderColor: p.color }}
          >
            <img src={p.image} alt={p.name} className="player-image" />
            <span className="player-score">{scores[idx]}</span>
            {predicted === idx && !predicting && (
              <span className="player-predicted">你的预测</span>
            )}
            {playerStatus[idx] === 'eliminated' && (
              <span className="player-eliminated">已淘汰</span>
            )}
          </div>
        ))}
      </div>
      <div className="board-outer" style={{ background: currentConfig.color }}>
        <div className="board" style={{ background: currentConfig.color }}>
          {board.map((row, r) => (
            <div key={r} className="board-row">
              {row.map((cell, c) => (
                <div
                  key={c}
                  className={`cell${cell.opened ? " opened" : ""}${cell.mine && cell.opened ? " mine" : ""}${cell.owner !== undefined ? " owned" : ""}${lastOpenedCell?.row === r && lastOpenedCell?.col === c ? " last-opened" : ""}`}
                  style={cell.owner !== undefined ? { borderColor: PLAYERS[cell.owner].color } : {}}
                  data-adjacent={cell.adjacent}
                >
                  {cell.opened
                    ? cell.mine
                      ? "💣"
                      : cell.adjacent > 0
                      ? cell.adjacent
                      : ""
                    : ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="status">
        {gameOver
          ? <>
              <span className="game-result">游戏结束！</span>
              {predicted !== null && (
                <span className="prediction-result">
                  {(() => {
                    return winners.includes(predicted)
                      ? <span style={{ color: PLAYERS[predicted].color }}>你猜对啦 🎉</span>
                      : <span style={{ color: '#F56C6C' }}>很遗憾，胜者是 
                          {winners.map(i => (
                            <img 
                              key={i} 
                              src={PLAYERS[i].image} 
                              alt={PLAYERS[i].name} 
                              className="player-image-tiny" 
                              style={{background: PLAYERS[i].color}}
                            />
                          ))}
                        </span>;
                  })()}
                </span>
              )}
              <div className="game-stats">
                <span className="rounds-count">总回合数: {rounds}</span>
              </div>
              <button className="restart-btn" onClick={handleRestart}>再来一局</button>
            </>
          : <span>当前回合：
              <img 
                src={PLAYERS[currentPlayer].image} 
                alt={PLAYERS[currentPlayer].name} 
                className="player-image-small" 
                style={{background: PLAYERS[currentPlayer].color}}
              /> 
              <span className="round-indicator">({rounds})</span>
            </span>
        }
      </div>
    </div>
  );
}

export default App;
