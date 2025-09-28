import React, { useRef, useEffect, useState, useCallback } from 'react';
import './App.css';
import Leaderboard from './components/Leaderboard';
import LeaderboardService from './services/leaderboardService';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const PIPE_WIDTH = 55;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.5;
const BIRD_IMAGE_SRC = '/bird.png'; // Place bird.png in public/ directory

interface Player {
  x: number;
  y: number;
  velocity: number;
  size: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const birdImageRef = useRef<HTMLImageElement | null>(null);
  const [score, setScore] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [birdLoaded, setBirdLoaded] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; vx: number; vy: number; life: number; }[]>([]);
  const [player, setPlayer] = useState<Player>({
    x: 50,
    y: GAME_HEIGHT / 2,
    velocity: 0,
    size: 32
  });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);

  const handleScoreSubmit = useCallback((playerNameInput: string, scoreInput: number) => {
    const trimmed = playerNameInput.trim();
    if (!trimmed || scoreInput <= 0) return;
    const service = LeaderboardService.getInstance();
    service.addScore(trimmed, scoreInput);
  }, []);

  const jump = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      setPipes([]);
      setPlayer(prev => ({ ...prev, y: GAME_HEIGHT / 2, velocity: 0 }));
    } else if (!gameOver) {
      setPlayer(prev => ({ ...prev, velocity: JUMP_FORCE }));
      // spawn particles on jump
      setParticles(prev => {
        const newParticles = Array.from({ length: 8 }).map(() => ({
          x: player.x + player.size / 2,
          y: player.y + player.size,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          life: 30
        }));
        return [...prev, ...newParticles];
      });
    } else {
      // Restart game
      setGameStarted(false);
      setGameOver(false);
      setScore(0);
      setPipes([]);
      setPlayer(prev => ({ ...prev, y: GAME_HEIGHT / 2, velocity: 0 }));
      setPlayerName('');
      setHasSavedScore(false);
      setParticles([]);
      setClouds([]);
    }
  }, [gameStarted, gameOver, player]);

  // Load bird image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      birdImageRef.current = img;
      setBirdLoaded(true);
    };
    img.onerror = () => {
      setBirdLoaded(false);
    };
    img.src = BIRD_IMAGE_SRC;
  }, []);

  // Prefill saved player name
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('flappy-bird-player-name');
      if (savedName) setPlayerName(savedName);
    } catch {}
  }, []);

  const checkCollision = (player: Player, pipes: Pipe[]): boolean => {
    // Ground collision
    if (player.y + player.size >= GAME_HEIGHT) return true;
    
    // Ceiling collision
    if (player.y <= 0) return true;

    // Pipe collision
    for (const pipe of pipes) {
      if (player.x + player.size > pipe.x && player.x < pipe.x + PIPE_WIDTH) {
        if (player.y < pipe.topHeight || player.y + player.size > pipe.bottomY) {
          return true;
        }
      }
    }
    return false;
  };

  const updateGame = useCallback(() => {
    if (!gameStarted || gameOver) return;

    // Update clouds
    setClouds(prevClouds => {
      let newClouds = prevClouds.map(cloud => ({
        ...cloud,
        x: cloud.x - cloud.speed
      })).filter(cloud => cloud.x + cloud.size > 0);

      // Add new clouds occasionally
      if (Math.random() < 0.02 && newClouds.length < 5) {
        newClouds.push({
          x: GAME_WIDTH + 50,
          y: Math.random() * (GAME_HEIGHT * 0.6) + 20,
          size: Math.random() * 30 + 20,
          speed: Math.random() * 0.5 + 0.2
        });
      }

      return newClouds;
    });

    setPlayer(prevPlayer => {
      const newPlayer = {
        ...prevPlayer,
        y: prevPlayer.y + prevPlayer.velocity,
        velocity: prevPlayer.velocity + GRAVITY
      };

      // Check collision
      if (checkCollision(newPlayer, pipes)) {
        setGameOver(true);
        setShowPopup(true);
        return prevPlayer;
      }

      return newPlayer;
    });

    setPipes(prevPipes => {
      let newPipes = prevPipes.map(pipe => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED
      })).filter(pipe => pipe.x + PIPE_WIDTH > 0);

      // Add new pipe
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_WIDTH - 220) {
        const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
        newPipes.push({
          x: GAME_WIDTH,
          topHeight,
          bottomY: topHeight + PIPE_GAP,
          passed: false
        });
      }

      // Update score
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < player.x) {
          pipe.passed = true;
          setScore(prev => prev + 1);
        }
      });

      return newPipes;
    });
  }, [gameStarted, gameOver, pipes, player.x]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw background with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#8B5FBF'); // Purple
    gradient.addColorStop(1, '#E91E63'); // Pink
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    clouds.forEach(cloud => {
      const { x, y, size } = cloud;
      // Draw cloud as overlapping circles
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.arc(x + size * 0.3, y, size * 0.5, 0, Math.PI * 2);
      ctx.arc(x + size * 0.6, y, size * 0.4, 0, Math.PI * 2);
      ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw pipes
    ctx.fillStyle = '#228B22';
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, GAME_HEIGHT - pipe.bottomY);
    });

    // Draw player (sprite with slight rotation based on velocity)
    const angleDeg = Math.max(-30, Math.min(45, player.velocity * 3));
    const angleRad = (angleDeg * Math.PI) / 180;
    const drawWidth = player.size;
    const drawHeight = player.size;
    const centerX = player.x + drawWidth / 2;
    const centerY = player.y + drawHeight / 2;

    if (birdLoaded && birdImageRef.current) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angleRad);
      ctx.drawImage(
        birdImageRef.current,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.restore();
    } else {
      // Fallback rectangle if image not available
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(player.x, player.y, player.size, player.size);
    }

    // Draw and update particles
    setParticles(prev => {
      const updated = prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 })).filter(p => p.life > 0);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      updated.forEach(p => {
        ctx.fillRect(p.x, p.y, 2, 2);
      });
      return updated;
    });

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText(score.toString(), 20, 50);

    // Draw instructions
    if (!gameStarted) {
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText('Click or Press Space to Start!', 50, GAME_HEIGHT / 2 + 50);
    }

    if (gameOver) {
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText('Game Over! Click to Restart', 50, GAME_HEIGHT / 2 + 50);
    }
  }, [pipes, player, score, gameStarted, gameOver, birdLoaded, clouds]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame();
      draw();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    if (gameStarted && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      draw();
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [updateGame, draw, gameStarted, gameOver]);

  // Event listeners
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  return (
    <div className="App" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #8B5FBF 0%, #E91E63 100%)',
      padding: '10px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ 
        margin: '10px 0', 
        fontSize: 'clamp(24px, 5vw, 32px)',
        color: '#333'
      }}>
        Flappy Bird GDC
      </h1>
      {!gameStarted && !gameOver && (
        <div style={{ color: '#333', marginBottom: 8, fontSize: '14px' }}>
          Press Space to start
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{ 
          border: '2px solid #333', 
          background: 'linear-gradient(135deg, #8B5FBF 0%, #E91E63 100%)', 
          marginBottom: 16, 
          cursor: 'pointer',
          maxWidth: '100%',
          height: 'auto'
        }}
        onClick={jump}
      />
      <div style={{ 
        marginBottom: 16, 
        fontSize: 'clamp(16px, 4vw, 20px)',
        color: '#333',
        fontWeight: 'bold'
      }}>
        Score: {score}
      </div>
      {/* Live Leaderboard */}
      <Leaderboard 
        currentScore={score} 
        onScoreSubmit={handleScoreSubmit}
      />
      {/* Popup */}
      {showPopup && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            background: '#fff', 
            padding: 'clamp(20px, 5vw, 32px)', 
            borderRadius: 16, 
            textAlign: 'center', 
            maxWidth: 'min(90vw, 400px)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ 
              fontSize: 'clamp(20px, 5vw, 24px)',
              margin: '0 0 16px 0',
              color: '#333'
            }}>
              GAME OVER!
            </h2>
            <p style={{ 
              fontSize: 'clamp(16px, 4vw, 18px)',
              margin: '8px 0',
              color: '#666'
            }}>
              Final Score: <strong style={{ color: '#4CAF50' }}>{score}</strong>
            </p>
            <div style={{ margin: '12px 0 8px 0' }}>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #eee',
                  borderRadius: 8,
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={() => {
                  const trimmed = playerName.trim();
                  if (trimmed && score > 0 && !hasSavedScore) {
                    handleScoreSubmit(trimmed, score);
                    try { localStorage.setItem('flappy-bird-player-name', trimmed); } catch {}
                    setHasSavedScore(true);
                    setShowPopup(false);
                  }
                }}
                style={{
                  width: '100%',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: 'clamp(10px, 3vw, 12px)',
                  borderRadius: '8px',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  cursor: 'pointer',
                  marginTop: 8
                }}
                disabled={score <= 0 || playerName.trim().length === 0 || hasSavedScore}
              >
                {hasSavedScore ? 'Saved!' : 'Save to Leaderboard'}
              </button>
            </div>
            <p style={{ 
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              margin: '8px 0 20px 0',
              color: '#333'
            }}>
              Bored of the same old game? Think it’s too silly or too easy? Then stop just playing and start creating!<br/>
              Come pitch your wildest ideas and watch them come to life.
            </p>
            <button 
              onClick={() => setShowPopup(false)}
              style={{ 
                background: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                padding: 'clamp(10px, 3vw, 12px) clamp(20px, 5vw, 24px)', 
                borderRadius: '8px', 
                fontSize: 'clamp(14px, 3.5vw, 16px)', 
                cursor: 'pointer',
                marginTop: '16px',
                minWidth: '120px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
