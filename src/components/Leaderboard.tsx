import React, { useState, useEffect } from 'react';
import LeaderboardService, { LeaderboardEntry } from '../services/leaderboardService';

interface LeaderboardProps {
  currentScore: number;
  onScoreSubmit: (playerName: string, score: number) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentScore, onScoreSubmit }) => {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    const leaderboardService = LeaderboardService.getInstance();
    
    // Subscribe to score updates
    const unsubscribe = leaderboardService.subscribe((newScores) => {
      setScores(newScores);
      
      // Check if current score would be a new high score
      const isHighScore = newScores.length < 10 || currentScore > (newScores[9]?.score || 0);
      setIsNewHighScore(isHighScore);
    });

    return unsubscribe;
  }, [currentScore]);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onScoreSubmit(playerName.trim(), currentScore);
      setShowSubmitForm(false);
      setPlayerName('');
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '⭐';
      case 1: return '✨';
      case 2: return '💫';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1443 0%, #0d0221 100%)',
      borderRadius: 12,
      padding: 'clamp(12px, 3vw, 16px)',
      minWidth: '280px',
      maxWidth: '90vw',
      width: '100%',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
      marginBottom: 16,
      boxSizing: 'border-box',
      border: '2px solid #00ffff'
    }}>
      <h3 style={{
        margin: '0 0 12px 0',
        color: '#00ffff',
        fontSize: 'clamp(16px, 4vw, 18px)',
        textAlign: 'center',
        fontFamily: 'monospace',
        textShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
      }}>
        LEADERBOARD
      </h3>
      <button
        onClick={() => LeaderboardService.getInstance().clearScores()}
        style={{
          width: '100%',
          background: '#ff0066',
          color: 'white',
          border: '2px solid #ff0066',
          padding: '6px 10px',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 12,
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 'bold'
        }}
        title="Remove all saved scores from this device"
      >
        CLEAR BOARD
      </button>
      
      {isNewHighScore && currentScore > 0 && (
        <div style={{
          background: '#00ff00',
          color: '#000',
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          textAlign: 'center',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          animation: 'pulse 1s infinite',
          border: '2px solid #00ff00'
        }}>
          NEW HIGH SCORE!
        </div>
      )}

      {!showSubmitForm && currentScore > 0 && (
        <button
          onClick={() => setShowSubmitForm(true)}
          style={{
            width: '100%',
            background: '#00ff00',
            color: '#000',
            border: '2px solid #00ff00',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 12,
            fontSize: '14px',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}
        >
          SUBMIT SCORE
        </button>
      )}

      {showSubmitForm && (
        <form onSubmit={handleSubmitScore} style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #00ffff',
              borderRadius: 6,
              marginBottom: 8,
              fontSize: '14px',
              boxSizing: 'border-box',
              background: '#0a0e27',
              color: '#00ffff',
              fontFamily: 'monospace'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                background: '#00ff00',
                color: '#000',
                border: '2px solid #00ff00',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}
            >
              SUBMIT
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitForm(false)}
              style={{
                flex: 1,
                background: '#ff0066',
                color: '#fff',
                border: '2px solid #ff0066',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold'
              }}
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {scores.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#00ffff',
            fontStyle: 'italic',
            padding: '20px 0',
            fontFamily: 'monospace'
          }}>
            No scores yet. Be the first!
          </div>
        ) : (
          scores.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: index < scores.length - 1 ? '1px solid rgba(0, 255, 255, 0.2)' : 'none',
                background: index < 3 ? 'rgba(0, 255, 255, 0.1)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '16px', minWidth: 24, fontFamily: 'monospace', color: '#ff00ff' }}>
                  {getRankIcon(index)}
                </span>
                <span style={{
                  fontWeight: index < 3 ? 'bold' : 'normal',
                  color: index < 3 ? '#00ffff' : '#ffffff',
                  fontFamily: 'monospace'
                }}>
                  {entry.playerName}
                </span>
              </div>
              <span style={{
                fontWeight: 'bold',
                color: index < 3 ? '#00ff00' : '#00ffff',
                fontFamily: 'monospace'
              }}>
                {entry.score}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: 12,
        fontSize: '12px',
        color: '#00ffff',
        fontFamily: 'monospace',
        opacity: 0.7
      }}>
        UPDATES IN REAL-TIME
      </div>
    </div>
  );
};

export default Leaderboard;
