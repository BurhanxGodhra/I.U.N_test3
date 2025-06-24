import React, { useState, useEffect } from 'react';
import { Download, Upload, Printer, CheckCircle, Clock, Filter, Eye, Save } from 'lucide-react';
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
  fileId?: string | null;
}

interface PoemListResponse {
  poems: ApiPoem[];
  total: number;
  page: number;
  perPage: number;
}

const AdminPoemCheckingPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [poems, setPoems] = useState<Poem[]>([]);
  const [filteredPoems, setFilteredPoems] = useState<Poem[]>([]);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showArazUploadModal, setShowArazUploadModal] = useState(false);
  const [arazContent, setArazContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  
  // Fetch approved poems
  useEffect(() => {
    const fetchPoems = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
          params: {
            approved: true,
            page: 1,
            perPage: 100,
          },
        });
        const data: PoemListResponse = response.data;
        const apiPoems: ApiPoem[] = data.poems;
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
      } catch (err) {
        setError('Failed to load approved Nazms. Check console for details.');
        console.error('Fetch Nazms error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoems();
  }, [user?.token]);
  
  // Apply filters
  useEffect(() => {
    let filtered = poems;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(poem => poem.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(poem => poem.type === typeFilter);
    }
    
    if (languageFilter !== 'all') {
      filtered = filtered.filter(poem => poem.language === languageFilter);
    }
    
    setFilteredPoems(filtered);
  }, [poems, statusFilter, typeFilter, languageFilter]);
  
  const selectedPoem = selectedPoemId 
    ? poems.find(poem => poem.id === selectedPoemId) 
    : null;
  
  const handleDownloadPoem = async (poem: Poem) => {
    try {
      setLoading(true);
      if (poem.fileName || poem.audioFileName) {
        const fileId = poem.fileName || poem.audioFileName;
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/files/${fileId}`, { // Centralized API call
          headers: { Authorization: `Bearer ${user?.token}` },
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', poem.fileName || poem.audioFileName || 'file');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const content = `${poem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'} by ${poem.author.name}
Language: ${poem.language}
Entry Date: ${new Date(poem.entryDate).toLocaleDateString()}

Content:
${poem.content}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${poem.type}_${poem.author.name}_${poem.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download Nazm.');
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrintArazVersion = (poem: Poem) => {
    if (!poem.arazContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Araz Version - ${poem.author.name}</title>
            <style>
              body { font-family: serif; line-height: 1.6; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .content { white-space: pre-line; font-size: 16px; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              ${poem.language === 'Arabic' || poem.language === 'Urdu' ? '.content { direction: rtl; text-align: right; }' : ''}
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${poem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'} - Araz Version</h1>
              <p>By ${poem.author.name} | Language: ${poem.language}</p>
              <p>Entry Date: ${new Date(poem.entryDate).toLocaleDateString()}</p>
            </div>
            <div class="content">${poem.arazContent}</div>
            <div class="footer">
              <p>Insha Un Nazm - 1447</p>
              <p>Printed on: ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };
  
  const handleStatusUpdate = async (poemId: string, newStatus: 'araz_done' | 'araz_pending') => {
    try {
      setLoading(true);
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/poems/${poemId}/status`, // Centralized API call
        { status: newStatus },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setPoems(poems.map(poem => 
        poem.id === poemId 
          ? { ...poem, status: newStatus }
          : poem
      ));
    } catch (err) {
      setError('Failed to update status.');
      console.error('Status update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleArazUpload = async () => {
    if (!selectedPoemId || (!arazContent.trim() && !selectedFile) || !user?.token) return;
    
    try {
      setLoading(true);
      const poem = poems.find(p => p.id === selectedPoemId);
      if (!poem?.approved) {
        setError('Cannot upload araz version. Nazm must be approved first.');
        return;
      }

      const formData = new FormData();
      if (arazContent.trim()) {
        formData.append('araz_content', arazContent);
      }
      if (selectedFile) {
        formData.append('araz_file', selectedFile);
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/poems/${selectedPoemId}/araz`, // Centralized API call
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      setPoems(poems.map(poem => 
        poem.id === selectedPoemId 
          ? { 
              ...poem, 
              arazContent: arazContent,
              status: 'araz_done'
            }
          : poem
      ));
      
      setShowArazUploadModal(false);
      setArazContent('');
      setSelectedFile(null);
      setSelectedPoemId(null);
    } catch (err) {
      setError('Failed to upload araz version.');
      console.error('Araz upload error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  if (loading) {
    return (
      <AppLayout title="Nazm Checking & Araz Management">
        <div className="flex h-screen items-center justify-center">
          <p className="text-secondary-600">Loading approved Nazms...</p>
        </div>
      </AppLayout>
    );
  }
  
  if (error) {
    return (
      <AppLayout title="Nazm Checking & Araz Management">
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
    <AppLayout title="Nazm Checking & Araz Management">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Nazm Checking & Araz Management</h2>
          <p className="text-secondary-600">
            Download Nazms, upload araz versions, manage status, and print final versions.
          </p>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-secondary-500" aria-label="Filter icon" />
              <select
                className="form-input py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="araz_pending">Araz Pending</option>
                <option value="araz_done">Araz Done</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
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
          </div>
        </div>
        
        {/* Results info */}
        <div className="mb-6">
          <p className="text-secondary-600">
            Showing {filteredPoems.length} approved {filteredPoems.length === 1 ? 'Nazm' : 'Nazms'}
            {statusFilter !== 'all' ? ` — ${statusFilter === 'araz_done' ? 'Araz Done' : 'Araz Pending'}` : ''}
            {typeFilter !== 'all' ? ` — ${typeFilter === 'individual' ? 'Individual Abyat' : 'Full Nazam'}` : ''}
            {languageFilter !== 'all' ? ` in ${languageFilter}` : ''}
          </p>
        </div>
        
        {/* Poems grid */}
        {filteredPoems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoems.map((poem) => (
              <div key={poem.id} className="relative">
                {/* Admin action buttons */}
                <div className="absolute -top-2 -right-2 z-10 flex flex-col space-y-1">
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
                    <Eye size={16} className="text-primary-500 hover:text-primary-600" />
                  </button>
                  
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPoem(poem);
                    }}
                    title="Download Original"
                    aria-label="Download original Nazm"
                    disabled={loading}
                  >
                    <Download size={16} className="text-blue-500 hover:text-blue-600" />
                  </button>
                  
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoemId(poem.id);
                      setArazContent(poem.arazContent || '');
                      setShowArazUploadModal(true);
                    }}
                    title="Upload Araz Version"
                    aria-label="Upload araz version"
                    disabled={loading}
                  >
                    <Upload size={16} className="text-green-500 hover:text-green-600" />
                  </button>
                  
                  {poem.arazContent && (
                    <button
                      className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintArazVersion(poem);
                      }}
                      title="Print Araz Version"
                      aria-label="Print araz version"
                      disabled={loading}
                    >
                      <Printer size={16} className="text-purple-500 hover:text-purple-600" />
                    </button>
                  )}
                  
                  <button
                    className="bg-white rounded-full p-1 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = poem.status === 'araz_done' ? 'araz_pending' : 'araz_done';
                      handleStatusUpdate(poem.id, newStatus);
                    }}
                    title={`Mark as ${poem.status === 'araz_done' ? 'Pending' : 'Done'}`}
                    aria-label={`Mark poem as ${poem.status === 'araz_done' ? 'pending' : 'done'}`}
                    disabled={loading}
                  >
                    {poem.status === 'araz_pending' ? (
                      <Clock size={16} className="text-warning-500 hover:text-warning-600" />
                    ) : (
                      <CheckCircle size={16} className="text-success-500 hover:text-success-600" />
                    )}
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
            <h3 className="text-xl font-semibold mb-2">No approved Nazms available</h3>
            <p className="text-secondary-600">
              Approved Nazms will appear here for checking and araz management.
            </p>
          </div>
        )}
        
        {/* Poem details modal */}
        {selectedPoem && !showArazUploadModal && (
          <PoemDetails
            poem={selectedPoem}
            onClose={() => setSelectedPoemId(null)}
            isAdmin={true}
          />
        )}
        
        {/* Araz Upload Modal */}
        {showArazUploadModal && selectedPoem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-secondary-200">
                <h3 className="text-xl font-semibold">Upload Araz Version</h3>
                <p className="text-secondary-600 mt-1">
                  {selectedPoem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'} by {selectedPoem.author.name}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {/* Original Content */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Original Content:</h4>
                  <div className={`bg-secondary-50 p-4 rounded-lg poem-text ${
                    selectedPoem.language === 'Arabic' || selectedPoem.language === 'Urdu' ? 'rtl text-right' : ''
                  }`}>
                    {selectedPoem.content}
                  </div>
                </div>
                
                {/* File Upload Option */}
                <div className="mb-6">
                  <label className="form-label">Upload Araz File (Optional)</label>
                  <div className="border-2 border-dashed border-secondary-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept=".txt,.doc,.docx,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="araz-file"
                      disabled={loading}
                    />
                    <label htmlFor="araz-file" className="cursor-pointer">
                      <Upload size={24} className="mx-auto mb-2 text-secondary-400" />
                      <p className="text-secondary-600">
                        {selectedFile ? selectedFile.name : 'Click to upload araz file'}
                      </p>
                      <p className="text-sm text-secondary-500 mt-1">
                        Supported formats: TXT, DOC, DOCX, PDF
                      </p>
                    </label>
                  </div>
                </div>
                
                {/* Araz Content */}
                <div className="mb-6">
                  <label className="form-label">Araz Version Content</label>
                  <textarea
                    className={`form-input min-h-[300px] font-arabic text-lg leading-relaxed ${
                      selectedPoem.language === 'Arabic' || selectedPoem.language === 'Urdu' ? 'text-right' : ''
                    }`}
                    value={arazContent}
                    onChange={(e) => setArazContent(e.target.value)}
                    dir={selectedPoem.language === 'Arabic' || selectedPoem.language === 'Urdu' ? 'rtl' : 'ltr'}
                    placeholder="Enter the checked araz version here..."
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-secondary-200 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowArazUploadModal(false);
                    setArazContent('');
                    setSelectedFile(null);
                    setSelectedPoemId(null);
                  }}
                  className="btn btn-secondary"
                  disabled={loading}
                  aria-label="Cancel araz upload"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArazUpload}
                  className="btn btn-primary flex items-center"
                  disabled={loading || (!arazContent.trim() && !selectedFile)}
                  aria-label="Save araz version"
                >
                  <Save size={18} className="mr-2" />
                  {loading ? 'Saving...' : 'Save Araz Version'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPoemCheckingPage;