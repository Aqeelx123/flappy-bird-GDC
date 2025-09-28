// Leaderboard service for managing scores and real-time updates
export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  timestamp: number;
}

class LeaderboardService {
  private static instance: LeaderboardService;
  private scores: LeaderboardEntry[] = [];
  private listeners: ((scores: LeaderboardEntry[]) => void)[] = [];
  private maxEntries = 10;

  private constructor() {
    this.loadScores();
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  private loadScores(): void {
    try {
      const saved = localStorage.getItem('flappy-bird-leaderboard');
      if (saved) {
        this.scores = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.scores = [];
    }
  }

  private saveScores(): void {
    try {
      localStorage.setItem('flappy-bird-leaderboard', JSON.stringify(this.scores));
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.scores]));
  }

  addScore(playerName: string, score: number): void {
    const entry: LeaderboardEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      playerName,
      score,
      timestamp: Date.now()
    };

    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, this.maxEntries);
    
    this.saveScores();
    this.notifyListeners();
  }

  clearScores(): void {
    this.scores = [];
    this.saveScores();
    this.notifyListeners();
  }

  getScores(): LeaderboardEntry[] {
    return [...this.scores];
  }

  subscribe(listener: (scores: LeaderboardEntry[]) => void): () => void {
    this.listeners.push(listener);
    // Immediately call with current scores
    listener([...this.scores]);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Simulate real-time updates (in a real app, this would come from a WebSocket)
  simulateRealTimeUpdates(): void {
    setInterval(() => {
      // Simulate occasional new high scores from other players
      if (Math.random() < 0.1 && this.scores.length > 0) {
        const randomPlayer = `Player${Math.floor(Math.random() * 1000)}`;
        const randomScore = Math.floor(Math.random() * 50) + 1;
        this.addScore(randomPlayer, randomScore);
      }
    }, 5000); // Check every 5 seconds
  }
}

export default LeaderboardService;
