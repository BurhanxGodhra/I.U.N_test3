import React, { useState, useEffect } from 'react';
import { Star, Trophy, Eye, Filter } from 'lucide-react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import PoemCard from '../components/poems/PoemCard';
import PoemDetails from '../components/poems/PoemDetails';
import { Poem, Author } from '../types/poem';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  featuredDate?: string | null;
  createdAt: string;
}

const AdminFeaturedPoemPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [poems, setPoems] = useState<Poem[]>([]);
  const [filteredPoems, setFilteredPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [featuredPoem, setFeaturedPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);
  
  useEffect(() => {
    const fetchPoems = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems?approved=true&sortBy=rating&order=desc`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const apiPoems: ApiPoem[] = response.data.poems; // Access the 'poems' array
        const formattedPoems: Poem[] = apiPoems.map(apiPoem => ({
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
          featured: apiPoem.featured || false,
          featuredDate: apiPoem.featuredDate ?? null,
          entryDate: apiPoem.createdAt,
        }));
        setPoems(formattedPoems);
        setFeaturedPoem(formattedPoems.find(poem => poem.featured) || null);
      } catch (err) {
        setError('Failed to load approved poems.');
        console.error('Fetch poems error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoems();
  }, [user?.token]);
  
  useEffect(() => {
    let filtered = poems;
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(poem => poem.type === typeFilter);
    }
    
    if (languageFilter !== 'all') {
      filtered = filtered.filter(poem => poem.language === languageFilter);
    }
    
    setFilteredPoems(filtered);
  }, [poems, typeFilter, languageFilter]);
  
  const selectedPoem = selectedPoemId 
    ? poems.find(poem => poem.id === selectedPoemId) 
    : null;
  
  const handleFeaturePoem = async (poemId: string) => {
    try {
      setLoading(true);
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/poems/${poemId}/feature`, // Centralized API call
        { featured: true },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      const updatedPoems = poems.map(poem => ({
        ...poem,
        featured: poem.id === poemId ? true : false,
        featuredDate: poem.id === poemId ? new Date().toISOString() : null,
      }));
      setPoems(updatedPoems);
      const newFeaturedPoem = updatedPoems.find(poem => poem.id === poemId);
      setFeaturedPoem(newFeaturedPoem || null);
    } catch (err) {
      setError('Failed to feature Nazm.');
      console.error('Feature Nazm error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUnfeaturePoem = async () => {
    if (!featuredPoem) return;
    try {
      setLoading(true);
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/poems/${featuredPoem.id}/feature`, // Centralized API call
        { featured: false },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setPoems(poems.map(poem => ({
        ...poem,
        featured: false,
        featuredDate: null,
      })));
      setFeaturedPoem(null);
    } catch (err) {
      setError('Failed to unfeature Nazm.');
      console.error('Unfeature Nazm error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    const displayRating = rating ?? 0;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= Math.round(displayRating)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
            aria-label={`Star ${star} of ${Math.round(displayRating)}`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-secondary-700">
          {displayRating.toFixed(1)}
        </span>
      </div>
    );
  };
  
  if (loading) {
    return (
      <AppLayout title="Featured Poem Selection">
        <div className="flex h-screen items-center justify-center">
          <p className="text-secondary-600">Loading approved Nazms...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (error) {
    return (
      <AppLayout title="Featured Poem Selection">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <p className="text-error-600">{error}</p>
          <button 
            className="btn btn-primary mt-4" 
            onClick={() => window.location.reload()}
            aria-label="Retry loading Nazms"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Featured Nazm Selection">
      <div className="max-w-6xl mx-auto">
        {featuredPoem && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Trophy size={24} className="text-yellow-600 mr-2" aria-label="Featured Nazm" />
                <h3 className="text-lg font-semibold text-yellow-800">Current Featured Nazm</h3>
              </div>
              <button
                onClick={handleUnfeaturePoem}
                className="btn bg-yellow-600 text-white hover:bg-yellow-700"
                disabled={loading}
                aria-label="Remove featured Nazm"
              >
                Remove Feature
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    featuredPoem.type === 'individual' 
                      ? 'bg-accent-100 text-accent-700' 
                      : 'bg-primary-100 text-primary-700'
                  }`}>
                    {featuredPoem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'}
                  </span>
                  <span className="text-xs px-2 py-1 bg-secondary-100 rounded-full text-secondary-700">
                    {featuredPoem.language}
                  </span>
                </div>
                {renderStars(featuredPoem.rating)}
              </div>
              
              <div className={`poem-text text-sm mb-2 ${featuredPoem.language === 'Arabic' || featuredPoem.language === 'Urdu' ? 'rtl text-right' : ''}`}>
                {(featuredPoem.content || 'Uploaded content').split('\n').slice(0, 2).join('\n')}
                {(featuredPoem.content || '').split('\n').length > 2 && <span className="text-secondary-500">...</span>}
              </div>
              
              <div className="text-sm text-secondary-600">
                By {featuredPoem.author.name} {/* Prominently display author */}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-secondary-500" aria-label="Filter icon" />
              <select
                className="form-input py-2"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                disabled={loading}
                aria-label="Filter by Nazm type"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual Abyat</option>
                <option value="full">Full Nazam</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                className="form-input py-2"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                disabled={loading}
                aria-label="Filter by language"
              >
                <option value="all">All Languages</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="Urdu">Urdu</option>
                <option value="Lisan al-Dawah">Lisan al-Dawah</option>
                <option value="French">French</option>
              </select>
            </div>
            
            <div className="text-sm text-secondary-600">
              Showing approved poems sorted by rating
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-secondary-600">
            Showing {filteredPoems.length} approved {filteredPoems.length === 1 ? 'poem' : 'poems'}
            {typeFilter !== 'all' ? ` — ${typeFilter === 'individual' ? 'Individual Abyat' : 'Full Nazam'}` : ''}
            {languageFilter !== 'all' ? ` in ${languageFilter}` : ''}
          </p>
        </div>
        
        {filteredPoems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoems.map((poem) => (
              <div key={poem.id} className="relative">
                <div className="absolute -top-2 -right-2 z-10 flex space-x-1">
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoemId(poem.id);
                    }}
                    title="View Details"
                    aria-label="View Nazm details"
                    disabled={loading}
                  >
                    <Eye size={20} className="text-primary-500 hover:text-primary-600" />
                  </button>
                  
                  {!poem.featured && (
                    <button
                      className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeaturePoem(poem.id);
                      }}
                      title="Feature This Nazm"
                      aria-label="Feature this Nazm"
                      disabled={loading}
                    >
                      <Trophy size={20} className="text-yellow-500 hover:text-yellow-600" />
                    </button>
                  )}
                  
                  {poem.featured && (
                    <div className="bg-yellow-500 rounded-full p-1 shadow-md">
                      <Trophy size={20} className="text-white" aria-label="Featured Nazm" />
                    </div>
                  )}
                </div>
                
                <PoemCard 
                  poem={poem} 
                  onClick={() => setSelectedPoemId(poem.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Trophy size={48} className="mx-auto text-secondary-400 mb-4" aria-label="No poems icon" />
            <h3 className="text-xl font-semibold mb-2">No approved Nazms available</h3>
            <p className="text-secondary-600">
              Nazms will appear here once they are approved and rated.
            </p>
          </div>
        )}
        
        {selectedPoem && (
          <PoemDetails
            poem={selectedPoem}
            onClose={() => setSelectedPoemId(null)}
            isAdmin={true}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default AdminFeaturedPoemPage;