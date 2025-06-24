import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import VerseCard from '../components/opening-verses/VerseCard';
import { OpeningVerse } from '../types/verse';

const OpeningVersesPage: React.FC = () => {
  const [verses, setVerses] = useState<OpeningVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch opening verses
  useEffect(() => {
    const fetchVerses = async () => {
      try {
        setLoading(true);
        console.log('Fetching verses');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/verses`, { // Centralized API call
          });
        console.log('Verses response:', response.data);
        setVerses(response.data.map((verse: any) => ({
          id: verse.id,
          text: verse.content,
          author: verse.author || '',
          language: verse.language || 'Unknown',
          day: verse.day || 1,
          createdAt: verse.createdAt || new Date().toISOString(),
        })));
      } catch (err: any) {
        console.error('Fetch Matale error:', {
          message: err.message,
          name: err.name,
          code: err.code,
          response: err.response?.data || 'No response data',
          status: err.response?.status || 'No status',
        });
        setError('Failed to load Matale.');
        setVerses([]);
      } finally {
        setLoading(false);
        console.log('Loading state:', false);
      }
    };
    fetchVerses();
  }, []);

  // Group verses by day
  const versesByDay = verses.reduce((acc, verse) => {
    if (!acc[verse.day]) {
      acc[verse.day] = [];
    }
    acc[verse.day].push(verse);
    return acc;
  }, {} as Record<number, OpeningVerse[]>);
  
  // Sort days in ascending order (1 to 10 for festival progression)
  const sortedDays = Object.keys(versesByDay)
    .map(Number)
    .sort((a, b) => a - b);

  if (loading) {
    return (
      <AppLayout title="Matale">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-secondary-600">Loading Matale...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Matale">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Error Loading Matale</h3>
            <p className="text-error-600 mb-4">{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              aria-label="Retry loading Matale"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Matale">
      <div className="max-w-6xl mx-auto">
        <section className="bg-white rounded-lg shadow-sm p-6 mb-8" aria-label="Opening verses introduction">
          <h2 className="text-xl font-semibold mb-2">Daily Matale For You</h2>
          <p className="text-secondary-700">
            Each day, a matla will be provided in a different language.<br />
            You can select your preferred language from the dropdown menu and submit your nazam accordingly.
          </p>
        </section>
        
        {sortedDays.length > 0 ? (
          sortedDays.map((day) => (
            <section key={day} className="mb-12" aria-label={`Day ${day} Matale`}>
              <h3 className="text-xl font-semibold mb-6 border-b border-secondary-200 pb-2">
                Day {day} Matale
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {versesByDay[day].map((verse) => (
                  <VerseCard 
                    key={verse.id}
                    verse={verse}
                    onClick={() => console.log(`Clicked verse: ${verse.id}`)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">No Matale Available</h3>
            <p className="text-secondary-600">
              Matale will be added soon.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OpeningVersesPage;