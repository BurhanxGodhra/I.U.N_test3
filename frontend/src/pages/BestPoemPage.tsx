import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import PoemCard from '../components/poems/PoemCard';
import PoemDetails from '../components/poems/PoemDetails';
import { Poem, Author } from '../types/poem';
import { useAuth } from '../contexts/AuthContext'; // Import AuthContext

interface ApiPoem {
  id: string;
  type: 'individual' | 'full';
  content: string | null;
  language: 'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu';
  submissionMethod: 'upload' | 'recording' | 'manual';
  author: { userId: string; name: string }; // Updated to match backend
  status: 'araz_done' | 'araz_pending';
  approved: boolean;
  rating: number | null;
  fileName: string | null;
  audioFileName: string | null;
  arazContent: string | null;
  inspiredBy: string | null;
  featured: boolean;
  createdAt: string;
}

interface Category {
  title: string;
  poems: Poem[];
}

const BestPoemPage: React.FC = () => {
  const { user } = useAuth(); // Get user and token from AuthContext
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('highestRated');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch highly rated poems
  useEffect(() => {
    const fetchPoems = async () => {
      if (!user?.token) {
        setError('Please log in to view best poems.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` }, // Include token
          params: {
            approved: true, // Only approved poems
            rating_gte: null, // Remove unsupported param
          },
        });

        const apiPoems: ApiPoem[] = response.data.poems || []; // Match backend response structure
        const formattedPoems: Poem[] = apiPoems
          .filter(poem => poem.rating !== null && poem.rating >= 0) // Ensure ratings exist
          .map(apiPoem => ({
            id: apiPoem.id,
            type: apiPoem.type,
            content: apiPoem.content || 'Uploaded content',
            language: apiPoem.language,
            submissionMethod: apiPoem.submissionMethod,
            author: { id: apiPoem.author.userId, name: apiPoem.author.name } as Author, // Map to Author type
            status: apiPoem.status,
            approved: apiPoem.approved,
            rating: apiPoem.rating ?? 0,
            fileName: apiPoem.fileName || undefined,
            audioFileName: apiPoem.audioFileName || undefined,
            arazContent: apiPoem.arazContent || undefined,
            inspiredBy: apiPoem.inspiredBy || undefined,
            featured: apiPoem.featured,
            entryDate: apiPoem.createdAt,
          }))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)) // Sort by rating
          .slice(0, 3); // Limit to top 3

        setPoems(formattedPoems);
      } catch (err) {
        setError('Failed to load best poems.');
        console.error('Fetch poems error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoems();
  }, [user?.token]);

  // Define categories
  const categories: Record<string, Category> = {
    highestRated: {
      title: 'Highest Rated Poems',
      poems: [...poems].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 3),
    },
    byLanguage: {
      title: 'Best Poems by Language',
      poems: [
        // Best English poem
        [...poems]
          .filter(poem => poem.language === 'English')
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
        // Best French poem
        [...poems]
          .filter(poem => poem.language === 'French')
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
        // Best Arabic poem
        [...poems]
          .filter(poem => poem.language === 'Arabic')
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
        // Best Lisan al-Dawah poem
        [...poems]
          .filter(poem => poem.language === 'Lisan al-Dawah')
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
        // Best Urdu poem
        [...poems]
          .filter(poem => poem.language === 'Urdu')
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
      ].filter((poem): poem is Poem => Boolean(poem)),
    },
  };

  const selectedPoem = selectedPoemId 
    ? poems.find(poem => poem.id === selectedPoemId) 
    : null;

  if (loading) {
    return (
      <AppLayout title="Best Poems">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-secondary-600">Loading best poems...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Best Poems">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Error Loading Best Poems</h3>
            <p className="text-error-600 mb-4">{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
              aria-label="Retry loading best poems"
            >
              Retry
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Best Poems">
      <div className="max-w-6xl mx-auto">
        {/* Category selection */}
        <section className="bg-white rounded-lg shadow-sm p-4 mb-8" aria-label="Best poems category selection">
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories).map(([key, category]) => (
              <button
                key={key}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
                onClick={() => setSelectedCategory(key)}
                disabled={loading}
                aria-label={`View ${category.title.toLowerCase()}`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </section>
        
        {/* Selected category title */}
        <h2 className="text-2xl font-serif mb-6">
          {categories[selectedCategory].title}
        </h2>
        
        {/* Poems grid */}
        {categories[selectedCategory].poems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories[selectedCategory].poems.map((poem, index) => (
              <div key={poem.id} className="relative">
                {index === 0 && selectedCategory !== 'byLanguage' && (
                  <div className="absolute -top-4 -right-4 z-10 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">1st</span>
                  </div>
                )}
                <PoemCard 
                  poem={poem} 
                  onClick={() => setSelectedPoemId(poem.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">No Highly Rated Poems</h3>
            <p className="text-secondary-600">
              Poems with ratings will appear here once rated.
            </p>
          </div>
        )}
        
        {/* Poem details modal */}
        {selectedPoem && (
          <PoemDetails
            poem={selectedPoem}
            onClose={() => setSelectedPoemId(null)}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default BestPoemPage;