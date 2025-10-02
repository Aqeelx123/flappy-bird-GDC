import React, { useRef, useEffect, useState, useCallback } from 'react';
import './App.css';
import Leaderboard from './components/Leaderboard';
import LeaderboardService from './services/leaderboardService';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GRAVITY = 0.5;
const JUMP_FORCE = -9;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_GAP = 180;
const OBSTACLE_SPEED = 2;

interface Player {
  x: number;
  y: number;
  velocity: number;
  size: number;
}

interface Obstacle {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [hasSavedScore, setHasSavedScore] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [particles, setParticles] = useState<{ x: number; y: number; vx: number; vy: number; life: number; color: string; }[]>([]);
  const [player, setPlayer] = useState<Player>({
    x: 80,
    y: GAME_HEIGHT / 2,
    velocity: 0,
    size: 36
  });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [stars, setStars] = useState<Star[]>([]);

  const handleScoreSubmit = useCallback((playerNameInput: string, scoreInput: number) => {
    const trimmed = playerNameInput.trim();
    if (!trimmed || scoreInput <= 0) return;
    const service = LeaderboardService.getInstance();
    service.addScore(trimmed, scoreInput);
  }, []);

  const initStars = useCallback(() => {
    const newStars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      newStars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        brightness: Math.random()
      });
    }
    setStars(newStars);
  }, []);

  const jump = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      setGameOver(false);
      setScore(0);
      setObstacles([]);
      setPlayer(prev => ({ ...prev, y: GAME_HEIGHT / 2, velocity: 0 }));
      initStars();
    } else if (!gameOver) {
      setPlayer(prev => ({ ...prev, velocity: JUMP_FORCE }));
      setParticles(prev => {
        const newParticles = Array.from({ length: 10 }).map(() => ({
          x: player.x + player.size / 2,
          y: player.y + player.size,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2 + 1,
          life: 25,
          color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff'
        }));
        return [...prev, ...newParticles];
      });
    } else {
      setGameStarted(false);
      setGameOver(false);
      setScore(0);
      setObstacles([]);
      setPlayer(prev => ({ ...prev, y: GAME_HEIGHT / 2, velocity: 0 }));
      setPlayerName('');
      setHasSavedScore(false);
      setParticles([]);
      setStars([]);
    }
  }, [gameStarted, gameOver, player, initStars]);

  useEffect(() => {
    initStars();
  }, [initStars]);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('flappy-bird-player-name');
      if (savedName) setPlayerName(savedName);
    } catch {}
  }, []);

  const checkCollision = (player: Player, obstacles: Obstacle[]): boolean => {
    if (player.y + player.size >= GAME_HEIGHT) return true;
    if (player.y <= 0) return true;

    for (const obstacle of obstacles) {
      if (player.x + player.size > obstacle.x && player.x < obstacle.x + OBSTACLE_WIDTH) {
        if (player.y < obstacle.topHeight || player.y + player.size > obstacle.bottomY) {
          return true;
        }
      }
    }
    return false;
  };

  const updateGame = useCallback(() => {
    if (!gameStarted || gameOver) return;

    setStars(prevStars => {
      return prevStars.map(star => {
        let newX = star.x - star.speed;
        if (newX < -star.size) {
          newX = GAME_WIDTH + star.size;
        }
        return { ...star, x: newX, brightness: (star.brightness + 0.05) % 1 };
      });
    });

    setPlayer(prevPlayer => {
      const newPlayer = {
        ...prevPlayer,
        y: prevPlayer.y + prevPlayer.velocity,
        velocity: prevPlayer.velocity + GRAVITY
      };

      if (checkCollision(newPlayer, obstacles)) {
        setGameOver(true);
        setShowPopup(true);
        return prevPlayer;
      }

      return newPlayer;
    });

    setObstacles(prevObstacles => {
      let newObstacles = prevObstacles.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - OBSTACLE_SPEED
      })).filter(obstacle => obstacle.x + OBSTACLE_WIDTH > 0);

      if (newObstacles.length === 0 || newObstacles[newObstacles.length - 1].x < GAME_WIDTH - 250) {
        const topHeight = Math.random() * (GAME_HEIGHT - OBSTACLE_GAP - 120) + 60;
        newObstacles.push({
          x: GAME_WIDTH,
          topHeight,
          bottomY: topHeight + OBSTACLE_GAP,
          passed: false
        });
      }

      newObstacles.forEach(obstacle => {
        if (!obstacle.passed && obstacle.x + OBSTACLE_WIDTH < player.x) {
          obstacle.passed = true;
          setScore(prev => prev + 1);
        }
      });

      return newObstacles;
    });
  }, [gameStarted, gameOver, obstacles, player.x]);

  const drawPixelatedUFO = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, velocity: number) => {
    const tilt = Math.max(-15, Math.min(15, velocity * 2));
    const px = Math.floor(x);
    const py = Math.floor(y);

    ctx.save();
    ctx.translate(px + size / 2, py + size / 2);
    ctx.rotate((tilt * Math.PI) / 180);

    ctx.fillStyle = '#00ffff';
    const bodyWidth = size * 0.8;
    const bodyHeight = size * 0.4;
    ctx.fillRect(-bodyWidth / 2, -bodyHeight / 2 - 4, bodyWidth, bodyHeight);

    ctx.fillStyle = '#0099cc';
    const baseWidth = size;
    const baseHeight = size * 0.25;
    ctx.fillRect(-baseWidth / 2, bodyHeight / 2 - 6, baseWidth, baseHeight);

    ctx.fillStyle = '#ffff00';
    ctx.fillRect(-size * 0.2, -bodyHeight / 2, size * 0.4, size * 0.3);

    const lightColor = Date.now() % 400 < 200 ? '#ff00ff' : '#00ff00';
    ctx.fillStyle = lightColor;
    ctx.fillRect(-baseWidth / 2 + 4, bodyHeight / 2 + 2, 4, 4);
    ctx.fillRect(baseWidth / 2 - 8, bodyHeight / 2 + 2, 4, 4);

    if (velocity < -5) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.fillRect(-6, baseHeight / 2 + 4, 12, 10);
    }

    ctx.restore();
  };

  const drawPixelatedAsteroid = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    const px = Math.floor(x);
    const py = Math.floor(y);

    ctx.fillStyle = '#6b4f4f';
    ctx.fillRect(px, py, width, height);

    ctx.fillStyle = '#4a3535';
    ctx.fillRect(px, py, 4, height);
    ctx.fillRect(px + width - 4, py, 4, height);

    ctx.fillStyle = '#8b6f6f';
    for (let i = 0; i < height; i += 12) {
      const detailX = px + (Math.floor(i / 12) % 2 === 0 ? 8 : width - 12);
      ctx.fillRect(detailX, py + i, 4, 4);
    }

    ctx.fillStyle = '#9b7f7f';
    ctx.fillRect(px + 4, py, width - 8, 3);
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#1a1443');
    gradient.addColorStop(1, '#0d0221');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    stars.forEach(star => {
      const alpha = 0.3 + (Math.sin(star.brightness * Math.PI * 2) * 0.7);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      const pixelSize = Math.ceil(star.size);
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), pixelSize, pixelSize);
    });

    obstacles.forEach(obstacle => {
      drawPixelatedAsteroid(ctx, obstacle.x, 0, OBSTACLE_WIDTH, obstacle.topHeight);
      drawPixelatedAsteroid(ctx, obstacle.x, obstacle.bottomY, OBSTACLE_WIDTH, GAME_HEIGHT - obstacle.bottomY);
    });

    drawPixelatedUFO(ctx, player.x, player.y, player.size, player.velocity);

    setParticles(prev => {
      const updated = prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 })).filter(p => p.life > 0);
      updated.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 3, 3);
      });
      return updated;
    });

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 32px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(score.toString(), 20, 50);
    ctx.fillText(score.toString(), 20, 50);

    if (!gameStarted) {
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText('CLICK OR PRESS SPACE', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
      ctx.fillText('CLICK OR PRESS SPACE', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
      ctx.textAlign = 'left';
    }

    if (gameOver) {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
      ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
      ctx.textAlign = 'left';
    }
  }, [obstacles, player, score, gameStarted, gameOver, stars]);

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
      background: 'linear-gradient(180deg, #0a0e27 0%, #1a1443 50%, #0d0221 100%)',
      padding: '10px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{
        margin: '10px 0',
        fontSize: 'clamp(24px, 5vw, 32px)',
        color: '#00ffff',
        fontFamily: 'monospace',
        textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 2px 2px 0 #000',
        letterSpacing: '2px'
      }}>
        SPACE UFO ADVENTURE
      </h1>
      {!gameStarted && !gameOver && (
        <div style={{ color: '#00ffff', marginBottom: 8, fontSize: '14px', fontFamily: 'monospace', textShadow: '1px 1px 0 #000' }}>
          Press Space to start
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          border: '4px solid #00ffff',
          background: '#0a0e27',
          marginBottom: 16,
          cursor: 'pointer',
          maxWidth: '100%',
          height: 'auto',
          imageRendering: 'pixelated',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
        }}
        onClick={jump}
      />
      <div style={{
        marginBottom: 16,
        fontSize: 'clamp(16px, 4vw, 20px)',
        color: '#ff00ff',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        textShadow: '0 0 8px rgba(255, 0, 255, 0.8), 1px 1px 0 #000'
      }}>
        Score: {score}
      </div>
      <Leaderboard
        currentScore={score}
        onScoreSubmit={handleScoreSubmit}
      />
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1443 0%, #0d0221 100%)',
            padding: 'clamp(20px, 5vw, 32px)',
            borderRadius: 16,
            textAlign: 'center',
            maxWidth: 'min(90vw, 400px)',
            width: '100%',
            boxSizing: 'border-box',
            border: '3px solid #00ffff',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
          }}>
            <h2 style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              margin: '0 0 16px 0',
              color: '#ff00ff',
              fontFamily: 'monospace',
              textShadow: '0 0 10px rgba(255, 0, 255, 0.8)'
            }}>
              GAME OVER!
            </h2>
            <p style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              margin: '8px 0',
              color: '#00ffff',
              fontFamily: 'monospace'
            }}>
              Final Score: <strong style={{ color: '#00ff00' }}>{score}</strong>
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
                  border: '2px solid #00ffff',
                  borderRadius: 8,
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  boxSizing: 'border-box',
                  background: '#0a0e27',
                  color: '#00ffff',
                  fontFamily: 'monospace'
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
                  background: '#00ff00',
                  color: '#000',
                  border: 'none',
                  padding: 'clamp(10px, 3vw, 12px)',
                  borderRadius: '8px',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  cursor: 'pointer',
                  marginTop: 8,
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
                disabled={score <= 0 || playerName.trim().length === 0 || hasSavedScore}
              >
                {hasSavedScore ? 'SAVED!' : 'SAVE TO LEADERBOARD'}
              </button>
            </div>
            <p style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              margin: '8px 0 20px 0',
              color: '#00ffff',
              fontFamily: 'monospace',
              lineHeight: '1.5'
            }}>
              Bored of the same old game? Think it's too silly or too easy? Then stop just playing and start creating!<br/>
              Come pitch your wildest ideas and watch them come to life.
            </p>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                background: '#ff00ff',
                color: '#fff',
                border: 'none',
                padding: 'clamp(10px, 3vw, 12px) clamp(20px, 5vw, 24px)',
                borderRadius: '8px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                cursor: 'pointer',
                marginTop: '16px',
                minWidth: '120px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
