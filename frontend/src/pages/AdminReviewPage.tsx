import React, { useState, useEffect } from 'react';
import { Filter, CheckCircle, XCircle, Star, Eye } from 'lucide-react';
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

const AdminReviewPage: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [poems, setPoems] = useState<Poem[]>([]);
  const [filteredPoems, setFilteredPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);
  
  // Fetch poems from API
  useEffect(() => {
    const fetchPoems = async () => {
      if (!user?.token) {
        setError('Please log in as admin');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
          params: {
            status: statusFilter === 'pending' ? 'araz_pending' : statusFilter === 'approved' ? 'araz_done' : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            language: languageFilter !== 'all' ? languageFilter : undefined,
          },
        });

        const apiPoems: ApiPoem[] = response.data.poems;
        const formattedPoems: Poem[] = apiPoems.map((poem) => ({
          id: poem.id,
          type: poem.type,
          content: poem.content || 'Uploaded content',
          language: poem.language,
          submissionMethod: poem.submissionMethod,
          author: { id: poem.author.id, name: poem.author.name } as Author,
          status: poem.status,
          approved: poem.approved,
          rating: poem.rating ?? 0,
          fileName: poem.fileName || undefined,
          audioFileName: poem.audioFileName || undefined,
          arazContent: poem.arazContent || undefined,
          inspiredBy: poem.inspiredBy || undefined,
          featured: poem.featured || false,
          featuredDate: poem.featuredDate ?? null,
          entryDate: poem.createdAt,
        }));

        setPoems(formattedPoems);
        setFilteredPoems(formattedPoems);
      } catch (err) {
        setError('Failed to fetch poems. Please try again.');
        console.error('Fetch poems error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoems();
  }, [user?.token, statusFilter, typeFilter, languageFilter]);
  
  const selectedPoem = selectedPoemId 
    ? poems.find(poem => poem.id === selectedPoemId) 
    : null;
  
  const handleApprove = async () => {
    if (!selectedPoemId || !user?.token) return;
    
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/poems/${selectedPoemId}/approve`, // Centralized API call
        { approved: true }, // Send approved: true in the body
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      // Refetch poems to update UI
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
        headers: { Authorization: `Bearer ${user.token}` },
        params: {
          status: statusFilter === 'pending' ? 'araz_pending' : statusFilter === 'approved' ? 'araz_done' : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
        },
      });
      const apiPoems: ApiPoem[] = response.data.poems;
      const formattedPoems: Poem[] = apiPoems.map((poem) => ({
        id: poem.id,
        type: poem.type,
        content: poem.content || 'Uploaded content',
        language: poem.language,
        submissionMethod: poem.submissionMethod,
        author: { id: poem.author.id, name: poem.author.name } as Author,
        status: poem.status,
        approved: poem.approved,
        rating: poem.rating ?? 0,
        fileName: poem.fileName || undefined,
        audioFileName: poem.audioFileName || undefined,
        arazContent: poem.arazContent || undefined,
        inspiredBy: poem.inspiredBy || undefined,
        featured: poem.featured || false,
        featuredDate: poem.featuredDate ?? null,
        entryDate: poem.createdAt,
      }));
      setPoems(formattedPoems);
      setFilteredPoems(formattedPoems);
      setSelectedPoemId(null);
    } catch (err) {
      setError('Failed to approve poem. Please try again.');
      console.error('Approve poem error:', err);
    }
  };
  
  const handleReject = async () => {
    if (!selectedPoemId || !user?.token) return;
    
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/poems/${selectedPoemId}`, // Centralized API call
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      // Refetch poems
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
        headers: { Authorization: `Bearer ${user.token}` },
        params: {
          status: statusFilter === 'pending' ? 'araz_pending' : statusFilter === 'approved' ? 'araz_done' : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
        },
      });
      const apiPoems: ApiPoem[] = response.data.poems;
      const formattedPoems: Poem[] = apiPoems.map((poem) => ({
        id: poem.id,
        type: poem.type,
        content: poem.content || 'Uploaded content',
        language: poem.language,
        submissionMethod: poem.submissionMethod,
        author: { id: poem.author.id, name: poem.author.name } as Author,
        status: poem.status,
        approved: poem.approved,
        rating: poem.rating ?? 0,
        fileName: poem.fileName || undefined,
        audioFileName: poem.audioFileName || undefined,
        arazContent: poem.arazContent || undefined,
        inspiredBy: poem.inspiredBy || undefined,
        featured: poem.featured || false,
        featuredDate: poem.featuredDate ?? null,
        entryDate: poem.createdAt,
      }));
      setPoems(formattedPoems);
      setFilteredPoems(formattedPoems);
      setSelectedPoemId(null);
    } catch (err) {
      setError('Failed to reject poem. Please try again.');
      console.error('Reject poem error:', err);
    }
  };

  const handleRatePoem = async () => {
    if (!selectedPoemId || currentRating === 0 || !user?.token) return;
    
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/poems/${selectedPoemId}/rate`, // Centralized API call
        { rating: currentRating },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      // Refetch poems
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
        headers: { Authorization: `Bearer ${user.token}` },
        params: {
          status: statusFilter === 'pending' ? 'araz_pending' : statusFilter === 'approved' ? 'araz_done' : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          language: languageFilter !== 'all' ? languageFilter : undefined,
        },
      });
      const apiPoems: ApiPoem[] = response.data.poems;
      const formattedPoems: Poem[] = apiPoems.map((poem) => ({
        id: poem.id,
        type: poem.type,
        content: poem.content || 'Uploaded content',
        language: poem.language,
        submissionMethod: poem.submissionMethod,
        author: { id: poem.author.id, name: poem.author.name } as Author,
        status: poem.status,
        approved: poem.approved,
        rating: poem.rating ?? 0,
        fileName: poem.fileName || undefined,
        audioFileName: poem.audioFileName || undefined,
        arazContent: poem.arazContent || undefined,
        inspiredBy: poem.inspiredBy || undefined,
        featured: poem.featured || false,
        featuredDate: poem.featuredDate ?? null,
        entryDate: poem.createdAt,
      }));
      setPoems(formattedPoems);
      setFilteredPoems(formattedPoems);
      setShowRatingModal(false);
      setCurrentRating(0);
      setHoverRating(0);
      setSelectedPoemId(null);
    } catch (err) {
      setError('Failed to rate poem. Please try again.');
      console.error('Rate poem error:', err);
    }
  };

  const handleStarClick = (rating: number) => {
    setCurrentRating(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoverRating(rating);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const renderInteractiveStarRating = () => {
    const stars = [];
    const displayRating = hoverRating || currentRating;
    
    for (let i = 1; i <= 5; i++) {
      const isFull = i <= displayRating;
      const isHalf = i - 0.5 === displayRating;
      
      stars.push(
        <div key={i} className="relative cursor-pointer">
          <Star
            size={32}
            className={`transition-colors ${
              isFull ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            onClick={() => handleStarClick(i)}
            onMouseEnter={() => handleStarHover(i)}
            onMouseLeave={handleStarLeave}
            aria-label={`Rate ${i} stars`}
          />
          
          <div
            className="absolute inset-0 w-1/2 overflow-hidden cursor-pointer"
            onClick={() => handleStarClick(i - 0.5)}
            onMouseEnter={() => handleStarHover(i - 0.5)}
            onMouseLeave={handleStarLeave}
          >
            <Star
              size={32}
              className={`transition-colors ${
                isHalf || (displayRating >= i - 0.5 && displayRating < i) 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-transparent'
              }`}
              aria-label={`Rate ${i - 0.5} stars`}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-1">
        {stars}
      </div>
    );
  };

  const openRatingModal = (poemId: string) => {
    const poem = poems.find(p => p.id === poemId);
    if (!poem?.approved) {
      setError('Cannot rate an unapproved poem.');
      return;
    }
    setSelectedPoemId(poemId);
    setCurrentRating(poem?.rating || 0);
    setHoverRating(0);
    setShowRatingModal(true);
  };
  
  if (loading) {
    return (
      <AppLayout title="Review & Approve Nazm">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-secondary-600">Loading Nazms...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Review & Approve Nazm">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-red-600">{error}</p>
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
    <AppLayout title="Review & Approve Nazm">
      <div className="max-w-6xl mx-auto">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-secondary-500" aria-label="Filter icon" />
              <select
                className="form-input py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'approved' | 'all')}
                aria-label="Filter by status"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="all">All Nazms</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                className="form-input py-2"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by poem type"
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
          </div>
        </div>
        
        {/* Results info */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-secondary-600">
            Showing {filteredPoems.length} {filteredPoems.length === 1 ? 'submission' : 'submissions'}
            {statusFilter !== 'all' ? ` — ${statusFilter === 'pending' ? 'pending review' : 'approved'}` : ''}
            {typeFilter !== 'all' ? ` — ${typeFilter === 'individual' ? 'Individual Abyat' : 'Full Nazam'}` : ''}
            {languageFilter !== 'all' ? ` in ${languageFilter}` : ''}
          </p>
          
          <div className="flex space-x-4">
            <div className="flex items-center text-secondary-700">
              <div className="w-3 h-3 rounded-full bg-warning-500 mr-2"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center text-secondary-700">
              <div className="w-3 h-3 rounded-full bg-success-500 mr-2"></div>
              <span>Approved</span>
            </div>
          </div>
        </div>
        
        {/* Poems grid */}
        {filteredPoems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoems.map((poem) => (
              <div key={poem.id} className="relative">
                {/* Admin action buttons */}
                <div className="absolute -top-2 -right-2 z-10 flex space-x-1">
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoemId(poem.id);
                    }}
                    title="View Details"
                    aria-label="View Nazm details"
                  >
                    <Eye size={20} className="text-primary-500 hover:text-primary-600" />
                  </button>
                  
                  {!poem.approved && (
                    <button
                      className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedPoemId(poem.id);
                        await handleApprove();
                      }}
                      title="Approve"
                      aria-label="Approve Nazm"
                    >
                      <CheckCircle size={20} className="text-success-500 hover:text-success-600" />
                    </button>
                  )}
                  
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRatingModal(poem.id);
                    }}
                    title="Rate Nazm"
                    aria-label="Rate Nazm"
                    disabled={!poem.approved} // Disable if not approved
                  >
                    <Star size={20} className={`text-yellow-500 hover:text-yellow-600 ${!poem.approved ? 'opacity-50 cursor-not-allowed' : ''}`} />
                  </button>
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
            <h3 className="text-xl font-semibold mb-2">No submissions to review</h3>
            <p className="text-secondary-600">
              {statusFilter === 'pending' 
                ? 'All submissions have been reviewed!' 
                : 'No submissions match your filters.'}
            </p>
          </div>
        )}
        
        {/* Poem details modal */}
        {selectedPoem && !showRatingModal && (
          <PoemDetails
            poem={selectedPoem}
            onClose={() => setSelectedPoemId(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            isAdmin={true}
          />
        )}

        {/* Rating modal */}
        {showRatingModal && selectedPoem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-xl font-semibold mb-4">Rate This {selectedPoem.type === 'individual' ? 'Abyat' : 'Nazam'}</h3>
              
              <div className="mb-6">
                <p className="text-secondary-600 mb-4">Select a rating from 0.5 to 5 stars:</p>
                <div className="flex justify-center mb-4">
                  {renderInteractiveStarRating()}
                </div>
                <p className="text-sm text-secondary-500 text-center">
                  Current rating: {currentRating > 0 ? `${currentRating} star${currentRating > 1 ? 's' : ''}` : 'No rating selected'}
                </p>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setCurrentRating(0);
                    setHoverRating(0);
                    setSelectedPoemId(null);
                  }}
                  className="btn btn-secondary"
                  aria-label="Cancel rating"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRatePoem}
                  className="btn btn-primary"
                  disabled={currentRating === 0}
                  aria-label="Save rating"
                >
                  Save Rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminReviewPage;