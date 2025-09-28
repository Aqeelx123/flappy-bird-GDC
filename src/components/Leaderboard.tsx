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
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 12, 
      padding: 'clamp(12px, 3vw, 16px)', 
      minWidth: '280px',
      maxWidth: '90vw',
      width: '100%',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: 16,
      boxSizing: 'border-box'
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        color: '#333',
        fontSize: 'clamp(16px, 4vw, 18px)',
        textAlign: 'center'
      }}>
        🏆 Live Leaderboard
      </h3>
      <button
        onClick={() => LeaderboardService.getInstance().clearScores()}
        style={{
          width: '100%',
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '6px 10px',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 12,
          fontSize: '12px',
          opacity: 0.9
        }}
        title="Remove all saved scores from this device"
      >
        Clear Leaderboard (Local)
      </button>
      
      {isNewHighScore && currentScore > 0 && (
        <div style={{
          background: '#ffeb3b',
          color: '#333',
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          textAlign: 'center',
          fontWeight: 'bold',
          animation: 'pulse 1s infinite'
        }}>
          🎉 New High Score! 🎉
        </div>
      )}

      {!showSubmitForm && currentScore > 0 && (
        <button
          onClick={() => setShowSubmitForm(true)}
          style={{
            width: '100%',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 12,
            fontSize: '14px'
          }}
        >
          Submit Score
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
              border: '2px solid #ddd',
              borderRadius: 6,
              marginBottom: 8,
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitForm(false)}
              style={{
                flex: 1,
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {scores.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            fontStyle: 'italic',
            padding: '20px 0'
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
                borderBottom: index < scores.length - 1 ? '1px solid #eee' : 'none',
                background: index < 3 ? '#f8f9fa' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '16px', minWidth: 24 }}>
                  {getRankIcon(index)}
                </span>
                <span style={{ 
                  fontWeight: index < 3 ? 'bold' : 'normal',
                  color: index < 3 ? '#333' : '#666'
                }}>
                  {entry.playerName}
                </span>
              </div>
              <span style={{ 
                fontWeight: 'bold',
                color: index < 3 ? '#4CAF50' : '#333'
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
        color: '#999' 
      }}>
        Updates in real-time
      </div>
    </div>
  );
};

export default Leaderboard;
