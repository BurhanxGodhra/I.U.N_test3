import React, { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import PoemCard from '../components/poems/PoemCard';
import PoemDetails from '../components/poems/PoemDetails';
import { Poem, Author } from '../types/poem';
import { useAuth } from '../contexts/AuthContext';

interface ApiPoem {
  id: string;
  type: 'individual' | 'full';
  content: string | null;
  language: 'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu';
  submissionMethod: 'upload' | 'recording' | 'manual';
  author: { userId: string; name: string };
  status: 'araz_done' | 'araz_pending';
  approved: boolean;
  rating: number | null;
  fileName: string | null;
  audioFileName: string | null;
  arazContent: string | null;
  arazFileName: string | null;
  createdAt: string;
}

const ViewPoemsPage: React.FC = () => {
  const { user } = useAuth();
  const [poems, setPoems] = useState<Poem[]>([]);
  const [filteredPoems, setFilteredPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'araz'>('original');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoems = async () => {
      if (!user?.token || !user.id) {
        setError('Please log in to view your Nazms');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
          params: {
            type: typeFilter !== 'all' ? typeFilter : undefined,
            language: languageFilter !== 'all' ? languageFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            authorId: user.id, // Ensure this is always applied to filter by logged-in user
          },
        });

        console.log('Full API Response:', JSON.stringify(response.data, null, 2));
        const apiPoems: ApiPoem[] = response.data.poems || [];
        const formattedPoems: Poem[] = apiPoems.map((poem) => {
          const mappedPoem: Poem = {
            id: poem.id,
            type: poem.type || 'individual',
            content: poem.content || 'No content available',
            language: poem.language || 'English',
            submissionMethod: poem.submissionMethod || 'manual',
            author: {
              id: poem.author.userId || user.id,
              name: poem.author.name || user.name || 'Unknown',
            } as Author,
            status: poem.status || 'araz_pending',
            approved: poem.approved ?? false,
            rating: poem.rating ?? null,
            fileName: poem.fileName || undefined,
            audioFileName: poem.audioFileName || undefined,
            arazContent: poem.arazContent || undefined,
            inspiredBy: undefined,
            featured: false,
            featuredDate: undefined,
            entryDate: poem.createdAt || new Date().toISOString(),
          };
          console.log('Mapped Poem:', JSON.stringify(mappedPoem, null, 2));
          return mappedPoem;
        });

        console.log('Fetched Poem IDs:', formattedPoems.map((poem) => poem.id));
        setPoems(formattedPoems);
        setFilteredPoems(formattedPoems);
      } catch (err: any) {
        const status = err.response?.status || 'No status';
        const message = status === 401 ? 'Session expired. Please log in again.' : 'Failed to fetch Nazms. Please try again.';
        setError(message);
        console.error('Fetch Nazm error:', {
          message: err.message,
          response: err.response?.data || 'No response data',
          status,
        });
        if (status === 401) {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPoems();
  }, [user?.token, user?.id, typeFilter, languageFilter, statusFilter]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredPoems(poems);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = poems.filter(
      (poem) =>
        (poem.content ? poem.content.toLowerCase().includes(query) : false) ||
        poem.language.toLowerCase().includes(query)
    );
    setFilteredPoems(filtered);
  }, [poems, searchQuery]);

  const handleViewOriginal = (poemId: string) => {
    console.log('Selecting poem ID:', poemId);
    setSelectedPoemId(poemId);
    setViewMode('original');
  };

  const handleViewAraz = (poemId: string) => {
    console.log('Selecting poem ID for Araz:', poemId);
    setSelectedPoemId(poemId);
    setViewMode('araz');
  };

  if (loading) {
    return (
      <AppLayout title="My Submissions">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-secondary-600">Loading your Nazms...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="My Submissions">
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
    <AppLayout title="My Submissions">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-secondary-400" aria-label="Search icon" />
              </div>
              <input
                type="text"
                placeholder="Search your Nazm by content"
                className="form-input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search Nazm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-secondary-500" aria-label="Filter icon" />
              <select
                className="form-input py-2"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
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

            <div className="flex items-center space-x-2">
              <select
                className="form-input py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="araz_done">Araz Done</option>
                <option value="araz_pending">Araz Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-secondary-600">
            Showing {filteredPoems.length}{' '}
            {filteredPoems.length === 1 ? 'submission' : 'submissions'}
            {typeFilter !== 'all'
              ? ` — ${typeFilter === 'individual' ? 'Individual Abyat' : 'Full Nazam'}`
              : ''}
            {languageFilter !== 'all' ? ` in ${languageFilter}` : ''}
            {statusFilter !== 'all'
              ? ` — ${statusFilter === 'araz_done' ? 'Araz Done' : 'Araz Pending'}`
              : ''}
          </p>
        </div>

        {filteredPoems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoems.map((poem) => (
              <PoemCard
                key={poem.id}
                poem={poem}
                onClick={() => handleViewOriginal(poem.id)}
                onViewAraz={() => handleViewAraz(poem.id)}
                showButtons={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">No submissions found</h3>
            <p className="text-secondary-600">
              {poems.length === 0
                ? "You haven't submitted any Nazm yet. Start by submitting your first Nazm!"
                : "Try adjusting your search or filters to find what you're looking for."}
            </p>
          </div>
        )}

        {selectedPoemId && poems.find((p) => p.id === selectedPoemId) && (
          <PoemDetails
            poem={poems.find((p) => p.id === selectedPoemId)!}
            viewMode={viewMode}
            onClose={() => setSelectedPoemId(null)}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default ViewPoemsPage;