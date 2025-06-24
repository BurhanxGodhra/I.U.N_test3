import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';

interface LeaderboardEntry {
  authorName: string;
  totalStars: number;
  submissionCount: number;
}

const LeaderboardPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'individual' | 'full'>('individual');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard with authentication
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        // Retrieve token from localStorage using the correct key
        const token = localStorage.getItem('poetry_token'); // Changed from 'access_token' to 'poetry_token'
        if (!token) {
          setError('Please log in to view the leaderboard.');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/leaderboard?type=${selectedCategory}`, // Centralized API call
          {
            headers: {
              Authorization: `Bearer ${token}`, // Include token in Authorization header
            },
          }
        );
        const data: LeaderboardEntry[] = response.data.entries;
        setLeaderboard(data);
      } catch (err) {
        setError('Failed to load leaderboard.');
        console.error('Fetch leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedCategory]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} className="text-yellow-500" aria-label="First place" />;
      case 2:
        return <Medal size={24} className="text-gray-400" aria-label="Second place" />;
      case 3:
        return <Award size={24} className="text-amber-700" aria-label="Third place" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-800 font-semibold text-sm">
            {rank}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <AppLayout title="Leaderboard">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-secondary-600">Loading leaderboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Leaderboard">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Error Loading Leaderboard</h3>
            <p className="text-error-600 mb-4">{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              aria-label="Retry loading leaderboard"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Leaderboard">
      <div className="max-w-6xl mx-auto">
        {/* Category selection */}
        <section className="bg-white rounded-lg shadow-sm p-4 mb-8" aria-label="Leaderboard category selection">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'individual'
                  ? 'bg-accent-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
              onClick={() => setSelectedCategory('individual')}
              disabled={loading}
              aria-label="View individual abyat leaderboard"
            >
              Individual Abyat Leaderboard
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'full'
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
              onClick={() => setSelectedCategory('full')}
              disabled={loading}
              aria-label="View full nazam leaderboard"
            >
              Full Nazam Leaderboard
            </button>
          </div>
        </section>
        
        {/* Selected category title */}
        <h2 className="text-2xl font-serif mb-6">
          {selectedCategory === 'individual' ? 'Mumineen Baarizeen: Individual Abyat' : 'Mumineen Baarizeen: Full Nazams'}
          <span className="text-secondary-500 text-lg ml-2">
            (Ranked by Rubric Assessment)
          </span>
        </h2>
        
        {/* Leaderboard table */}
        {leaderboard.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="p-4 font-semibold text-secondary-700">Rank</th>
                  <th className="p-4 font-semibold text-secondary-700">Mumin</th>
                  <th className="p-4 font-semibold text-secondary-700">Total Stars</th>
                  <th className="p-4 font-semibold text-secondary-700">Submissions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr 
                    key={entry.authorName} 
                    className={`border-t border-secondary-200 hover:bg-secondary-50 ${
                      index < 3 ? 'border-l-4' : ''
                    } ${
                      index === 0 ? 'border-yellow-500' : 
                      index === 1 ? 'border-gray-400' : 
                      index === 2 ? 'border-amber-700' : ''
                    }`}
                  >
                    <td className="p-4">{getRankIcon(index + 1)}</td>
                    <td className="p-4 font-medium text-secondary-700">{entry.authorName}</td>
                    <td className="p-4">{entry.totalStars.toFixed(1)}</td>
                    <td className="p-4">{entry.submissionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">No poets ranked yet</h3>
            <p className="text-secondary-600">
              Mumineen will appear here once their {selectedCategory === 'individual' ? 'abyat' : 'nazams'} are rated.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LeaderboardPage;