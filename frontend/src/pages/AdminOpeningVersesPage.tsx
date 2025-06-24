import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar } from 'lucide-react';
import axios, { AxiosResponse } from 'axios';
import AppLayout from '../components/layout/AppLayout';
import { OpeningVerse } from '../types/verse';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminOpeningVersesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [verses, setVerses] = useState<OpeningVerse[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    author: '',
    language: 'English' as 'English' | 'Arabic' | 'Urdu' | 'Lisan al-Dawah' | 'French',
    day: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);
  
  // Fetch opening verses
  useEffect(() => {
    const fetchVerses = async () => {
      if (!user?.token || loading) {
        console.log('No user token or already loading, skipping fetch');
        return;
      }
      try {
        setLoading(true);
        console.log('Fetching verses with token:', user.token);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/verses`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
        });
        console.log('Verses response:', response.data);
        setVerses(response.data.map((verse: any) => ({
          id: verse.id,
          text: verse.content,
          author: verse.author || '',
          language: verse.language,
          day: verse.day,
          createdAt: verse.createdAt,
        })));
      } catch (err: any) {
        console.error('Fetch verses error:', {
          message: err.message,
          response: err.response?.data || 'No response data',
          status: err.response?.status || 'No status',
          config: err.config || 'No config',
        });
        setError('Failed to load opening verses.');
        setVerses([]);
      } finally {
        setLoading(false);
        console.log('Loading state:', false);
      }
    };
    fetchVerses();
  }, [user?.token]);

  // Log render state
  console.log('Rendering AdminOpeningVersesPage:', { loading, error, verses });
  
  // Group verses by day
  const versesByDay = verses.reduce((acc, verse) => {
    if (!acc[verse.day]) {
      acc[verse.day] = [];
    }
    acc[verse.day].push(verse);
    return acc;
  }, {} as Record<number, OpeningVerse[]>);
  
  const sortedDays = Object.keys(versesByDay)
    .map(Number)
    .sort((a, b) => a - b);
  
  const resetForm = () => {
    setFormData({
      text: '',
      author: '',
      language: 'English',
      day: 1,
    });
    setShowAddForm(false);
    setEditingId(null);
    setError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim() || !formData.author.trim()) {
      setError('Text and Lehen are required.');
      return;
    }
    if (formData.day < 1 || formData.day > 10) {
      setError('Day must be between 1 and 10.');
      return;
    }
    try {
      setLoading(true);
      let response: AxiosResponse<any, any>;
      if (editingId) {
        response = await axios.patch(`${import.meta.env.VITE_API_URL}/api/verses/${editingId}`, { // Centralized API call
          content: formData.text,
          author: formData.author,
          language: formData.language,
          day: formData.day,
        }, { headers: { Authorization: `Bearer ${user?.token}` } });
        setVerses(verses.map(verse =>
          verse.id === editingId ? {
            ...verse,
            text: response.data.content,
            author: response.data.author || '',
            language: response.data.language,
            day: response.data.day,
            createdAt: response.data.createdAt,
          } : verse
        ));
      } else {
        response = await axios.post(`${import.meta.env.VITE_API_URL}/api/verses`, { // Centralized API call
          content: formData.text,
          author: formData.author,
          language: formData.language,
          day: formData.day,
        }, { headers: { Authorization: `Bearer ${user?.token}` } });
        setVerses([...verses, {
          id: response.data.id,
          text: response.data.content,
          author: response.data.author || '',
          language: response.data.language,
          day: response.data.day,
          createdAt: response.data.createdAt,
        }]);
      }
      resetForm();
    } catch (err: any) {
      setError('Failed to save verse.');
      console.error('Save verse error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (verse: OpeningVerse) => {
    setFormData({
      text: verse.text,
      author: verse.author || '',
      language: verse.language,
      day: verse.day,
    });
    setEditingId(verse.id);
    setShowAddForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this opening verse?')) {
      try {
        setLoading(true);
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/verses/${id}`, { // Centralized API call
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        setVerses(verses.filter(verse => verse.id !== id));
      } catch (err) {
        setError('Failed to delete verse.');
        console.error('Delete verse error:', err);
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (loading && !showAddForm) {
    return (
      <AppLayout title="Manage Opening Verses">
        <div className="flex h-screen items-center justify-center">
          <p className="text-secondary-600">Loading opening verses...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (error && !showAddForm) {
    return (
      <AppLayout title="Manage Opening Verses">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <p className="text-error-600">{error}</p>
          <button 
            className="btn btn-primary mt-4" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Manage Matale">
      <div className="max-w-6xl mx-auto">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Daily Matale Management</h2>
            <p className="text-secondary-600 mt-1">
              Upload and manage daily Matale for all languages
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary flex items-center"
            disabled={loading}
            aria-label="Add new Matla"
          >
            <Plus size={18} className="mr-2" />
            Add Matla
          </button>
        </div>
        
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Opening Verse' : 'Add New Matla'}
            </h3>
            
            {error && (
              <p className="text-error-600 mb-4">{error}</p>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="language" className="form-label">Language</label>
                  <select
                    id="language"
                    className="form-input"
                    value={formData.language}
                    onChange={(e) => setFormData({
                      ...formData,
                      language: e.target.value as 'English' | 'Arabic' | 'Urdu' | 'Lisan al-Dawah' | 'French'
                    })}
                    disabled={loading}
                    aria-label="Select verse language"
                  >
                    <option value="English">English</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Urdu">Urdu</option>
                    <option value="Lisan al-Dawah">Lisan al-Dawah</option>
                    <option value="French">French</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="day" className="form-label">Day (1-10)</label>
                  <input
                    id="day"
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={formData.day}
                    onChange={(e) => setFormData({
                      ...formData,
                      day: parseInt(e.target.value) || 1
                    })}
                    disabled={loading}
                    aria-label="Enter festival day"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="author" className="form-label">Lehen</label>
                <input
                  id="author"
                  type="text"
                  className="form-input font-arabic"
                  value={formData.author}
                  onChange={(e) => setFormData({
                    ...formData,
                    author: e.target.value
                  })}
                  placeholder="Enter Lehen"
                  required
                  disabled={loading}
                  aria-label="Enter verse Lehen"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="text" className="form-label">Matla</label>
                <textarea
                  id="text"
                  className={`form-input font-arabic min-h-[120px] ${
                    formData.language === 'Arabic' || formData.language === 'Lisan al-Dawah' || formData.language === 'Urdu' ? 'text-right' : ''
                  }`}
                  value={formData.text}
                  onChange={(e) => setFormData({
                    ...formData,
                    text: e.target.value
                  })}
                  placeholder="Enter the Matla Here"
                  dir={formData.language === 'Arabic' || formData.language === 'Lisan al-Dawah' || formData.language === 'Urdu' ? 'rtl' : 'ltr'}
                  required
                  disabled={loading}
                  aria-label="Enter verse text"
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary flex items-center"
                  disabled={loading}
                  aria-label="Cancel verse form"
                >
                  <X size={18} className="mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center"
                  disabled={loading}
                  aria-label={editingId ? 'Update verse' : 'Add verse'}
                >
                  <Save size={18} className="mr-2" />
                  {loading ? 'Saving...' : editingId ? 'Update Verse' : 'Add Verse'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Verses by Day */}
        {sortedDays.length > 0 ? (
          <div className="space-y-8">
            {sortedDays.map((day) => (
              <div key={day} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Calendar size={20} className="text-primary-600 mr-2" />
                  <h3 className="text-xl font-semibold">Day {day} Matale</h3>
                  <span className="ml-2 text-sm text-secondary-500">
                    ({versesByDay[day].length} matla{versesByDay[day].length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {versesByDay[day].map((verse) => (
                    <div key={verse.id} className="border border-secondary-200 rounded-lg p-4 relative">
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <button
                          onClick={() => handleEdit(verse)}
                          className="p-1 text-primary-600 hover:text-primary-700"
                          title="Edit"
                          aria-label="Edit verse"
                          disabled={loading}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(verse.id)}
                          className="p-1 text-error-600 hover:text-error-700"
                          title="Delete"
                          aria-label="Delete verse"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Language badge */}
                      <div className="mb-3">
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                          {verse.language}
                        </span>
                      </div>
                      
                      {/* Verse content */}
                      <div className={`font-serif italic text-base mb-3 whitespace-pre-wrap ${
                        verse.language === 'Arabic' || verse.language === 'Lisan al-Dawah' || verse.language === 'Urdu' ? 'text-right' : ''
                      }`} dir={verse.language === 'Arabic' || verse.language === 'Lisan al-Dawah' || verse.language === 'Urdu' ? 'rtl' : 'ltr'}>
                        {verse.text}
                      </div>
                      
                      {/* Lehen */}
                      <div className="text-sm text-secondary-600">
                        — {verse.author || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Calendar size={48} className="mx-auto text-secondary-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Opening Verses</h3>
            <p className="text-secondary-600 mb-4">
              Start by adding opening verses for each day of the festival.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary"
              disabled={loading}
              aria-label="Add first opening verse"
            >
              Add First Opening Verse
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminOpeningVersesPage;