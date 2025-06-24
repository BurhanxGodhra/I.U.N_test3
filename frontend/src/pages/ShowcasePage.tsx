import React, { useState, useEffect } from 'react';
import { Star, Calendar, Trophy } from 'lucide-react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import { motion } from "framer-motion";
import { Poem, Author } from '../types/poem';
import { useAuth } from '../contexts/AuthContext'; // Added to access token

interface ApiPoem {
  id: string;
  type: 'individual' | 'full';
  content: string | null;
  language: 'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu';
  submissionMethod: 'upload' | 'recording' | 'manual';
  author: { id: string; name: string };
  status: 'araz_done' | 'araz_pending';
  approved: boolean;
  rating: number | null;
  fileName: string | null;
  audioFileName: string | null;
  arazContent: string | null;
  inspiredBy: string | null;
  featured: boolean;
  createdAt: string;
  featuredDate?: string;
}

const ShowcasePage: React.FC = () => {
  const { user } = useAuth(); // Added to access token
  const [featuredPoem, setFeaturedPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedPoem = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems?featured=true&approved=true`, { // Centralized API call
          headers: { Authorization: `Bearer ${user?.token}` }, // Added token
        });
        const apiPoems: ApiPoem[] = response.data.poems; // Access the 'poems' array
        if (apiPoems.length > 0) {
          const apiPoem = apiPoems[0]; // Take first featured poem
          const formattedPoem: Poem = {
            id: apiPoem.id,
            type: apiPoem.type,
            content: apiPoem.content || 'Uploaded content',
            language: apiPoem.language,
            submissionMethod: apiPoem.submissionMethod,
            author: { id: apiPoem.author.id, name: apiPoem.author.name } as Author,
            status: apiPoem.status,
            approved: apiPoem.approved,
            rating: apiPoem.rating ?? 0,
            fileName: apiPoem.fileName || undefined,
            audioFileName: apiPoem.audioFileName || undefined,
            arazContent: apiPoem.arazContent || undefined,
            inspiredBy: apiPoem.inspiredBy || undefined,
            featured: apiPoem.featured,
            entryDate: apiPoem.createdAt,
            featuredDate: apiPoem.featuredDate,
          };
          setFeaturedPoem(formattedPoem);
        } else {
          setFeaturedPoem(null);
        }
      } catch (err) {
        setError('Failed to load featured Nazm.');
        console.error('Fetch featured Nazm error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedPoem();
  }, [user?.token]); // Re-run if token changes

  if (loading) {
    return (
      <AppLayout title="Featured Poem of the Day">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-card">
            <p className="text-secondary-600">Loading featured Nazm...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !featuredPoem) {
    return (
      <AppLayout title="Featured Nazm of the Day">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12 bg-white rounded-lg shadow-card">
            <Trophy size={48} className="mx-auto text-secondary-400 mb-4" aria-label="Trophy icon" />
            <h3 className="text-xl font-semibold mb-2">No Featured Nazm Today</h3>
            <p className="text-secondary-600">
              {error ? error : 'Check back later for today\'s featured Nazm selection.'}
            </p>
            {error && (
              <button 
                className="btn btn-primary mt-4" 
                onClick={() => window.location.reload()}
                aria-label="Retry loading featured Nazm"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  const renderStars = () => {
    const displayRating = featuredPoem.rating ?? 0;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={`${
              star <= Math.round(displayRating)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
            aria-label={`Star ${star} of ${Math.round(displayRating)}`}
          />
        ))}
        <span className="ml-2 text-lg font-medium text-secondary-700">
          {displayRating.toFixed(1)}
        </span>
      </div>
    );
  };

  const featuredDate = featuredPoem.featuredDate 
    ? new Date(featuredPoem.featuredDate) 
    : new Date();

  return (
    <AppLayout title="Featured Nazm of the Day">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-card overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy size={24} className="text-yellow-500 mr-2" aria-label="Featured Nazm trophy" />
                <span className="text-lg font-semibold text-primary-600">Featured Nazm</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  featuredPoem.type === 'individual' 
                    ? 'bg-accent-100 text-accent-700' 
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {featuredPoem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'}
                </span>
                <span className="px-3 py-1 bg-secondary-100 text-secondary-700 text-sm rounded-full">
                  {featuredPoem.language}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-serif text-gray-900 mb-2">
                  {featuredPoem.type === 'individual' ? 'Featured Individual Abyat' : 'Featured Full Nazam'}
                </h2>
                <div className="flex items-center text-secondary-600">
                  <Calendar className="h-5 w-5 mr-2" aria-label="Calendar icon" />
                  <span>
                    Featured on {featuredDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center mb-6">
              <div className="flex-1">
                <p className="text-lg font-medium text-gray-900 mb-1">By {featuredPoem.author.name}</p> {/* Prominently display author */}
                <div className="flex items-center">
                  {renderStars()}
                </div>
              </div>
            </div>

            <div className="prose max-w-none mb-8">
              <div className={`font-serif text-xl leading-relaxed text-gray-700 whitespace-pre-line p-6 bg-secondary-50 rounded-lg ${
                featuredPoem.language === 'Arabic' || featuredPoem.language === 'Urdu' ? 'rtl' : ''
              }`}>
                {featuredPoem.content}
              </div>
            </div>

            <div className="text-center text-secondary-600">
              <p className="italic">
                "This {featuredPoem.type === 'individual' ? 'abyat' : 'nazam'} by {featuredPoem.author.name} has been selected as today's featured Nazm."
              </p> {/* Include author in promotion */}
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default ShowcasePage;