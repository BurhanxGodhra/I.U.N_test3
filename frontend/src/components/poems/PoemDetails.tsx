import React, { useState, useEffect } from 'react';
import { Star, Calendar, FileText, Mic, Upload, CheckCircle, Clock, ThumbsUp, ThumbsDown, Download, Play, Eye, FileCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { Poem, Author } from '../../types/poem';
import { useAuth } from '../../contexts/AuthContext';

interface PoemDetailsProps {
  poem: Poem & { fileId?: string };
  viewMode?: 'original' | 'araz';
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isAdmin?: boolean;
}

const PoemDetails: React.FC<PoemDetailsProps> = ({ 
  poem: initialPoem, 
  viewMode = 'original',
  onClose,
  onApprove,
  onReject,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [poem, setPoem] = useState<Poem & { fileId?: string }>(initialPoem);
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  useEffect(() => {
    const fetchPoem = async () => {
      if (!user?.token || !initialPoem.id) {
        setError('Invalid poem or user not logged in');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems/${initialPoem.id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const apiPoem = response.data;
        const formattedPoem: Poem & { fileId?: string } = {
          id: apiPoem.id,
          type: apiPoem.type || 'individual',
          content: apiPoem.content || initialPoem.content || 'Uploaded content',
          language: apiPoem.language || initialPoem.language || 'English',
          submissionMethod: apiPoem.submissionMethod || initialPoem.submissionMethod || 'manual',
          author: {
            id: apiPoem.author?.userId || initialPoem.author.id || '',
            name: apiPoem.author?.name || initialPoem.author.name || 'Unknown',
          } as Author,
          status: apiPoem.status || initialPoem.status || 'araz_pending',
          approved: apiPoem.approved ?? initialPoem.approved ?? false,
          rating: apiPoem.rating ?? initialPoem.rating ?? 0,
          fileName: apiPoem.fileName || initialPoem.fileName || undefined,
          audioFileName: apiPoem.audioFileName || initialPoem.audioFileName || undefined,
          arazContent: apiPoem.arazContent || initialPoem.arazContent || undefined,
          inspiredBy: apiPoem.inspiredBy || initialPoem.inspiredBy || undefined,
          featured: apiPoem.featured ?? initialPoem.featured ?? false,
          featuredDate: apiPoem.featuredDate ?? initialPoem.featuredDate ?? undefined,
          entryDate: apiPoem.createdAt || initialPoem.entryDate || new Date().toISOString(),
          fileId: apiPoem.fileId || initialPoem.fileId || undefined,
        };
        setPoem(formattedPoem);
      } catch (err: any) {
        setError(err.response?.status === 404 ? 'Poem not found' : 'Failed to load poem details');
        console.error('Fetch poem error:', {
          message: err.message,
          response: err.response?.data || 'No response data',
          status: err.response?.status || 'No status',
        });
        // Fallback to initial poem if API fails
        setPoem(initialPoem);
      } finally {
        setLoading(false);
      }
    };
    fetchPoem();
  }, [initialPoem.id, initialPoem, user?.token]);
  
  const getSubmissionInfo = () => {
    switch (poem.submissionMethod) {
      case 'upload':
        return {
          icon: <Upload size={18} className="text-secondary-500" />,
          text: 'File Upload',
          fileName: poem.fileName
        };
      case 'recording':
        return {
          icon: <Mic size={18} className="text-accent-500" />,
          text: 'Audio Recording',
          fileName: poem.audioFileName
        };
      default:
        return {
          icon: <FileText size={18} className="text-primary-500" />,
          text: 'Manual Entry',
          fileName: null
        };
    }
  };

  const submissionInfo = getSubmissionInfo();

  const renderStars = () => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={`${
              star <= Math.round(poem.rating ?? 0)
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
            aria-label={`Star ${star}`}
          />
        ))}
        <span className="ml-2 text-lg font-medium text-secondary-700">
          {poem.rating !== null && poem.rating > 0 ? `${poem.rating.toFixed(1)} / 5.0` : 'Not rated yet'}
        </span>
      </div>
    );
  };

  const getDisplayContent = () => {
    if (currentViewMode === 'araz' && poem.arazContent) {
      return poem.arazContent;
    }
    if (poem.submissionMethod === 'manual' && poem.content) {
      return poem.content;
    }
    if (poem.submissionMethod === 'upload' && poem.fileName) {
      return `Uploaded file: ${poem.fileName}`;
    }
    if (poem.submissionMethod === 'recording' && poem.audioFileName) {
      return `Audio recording: ${poem.audioFileName}`;
    }
    return 'No content available';
  };

  const handleDownload = async () => {
    if (!user?.token || (!poem.fileId && !poem.fileName && !poem.audioFileName)) return;
    try {
      setLoading(true);
      const fileId = poem.fileId || poem.fileName || poem.audioFileName;
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/poems/${poem.id}/download`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', poem.fileName || poem.audioFileName || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download file.');
      console.error('Download error:', {
        message: err.message,
        response: err.response?.data || 'No response data',
        status: err.response?.status || 'No status',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAudioPlayback = () => {
    const audio = document.getElementById('poem-audio') as HTMLAudioElement;
    if (audio) {
      if (audioPlaying) {
        audio.pause();
        setAudioPlaying(false);
      } else {
        audio.play();
        setAudioPlaying(true);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-secondary-600">Loading poem details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-error-600">{error}</p>
          <button onClick={onClose} className="btn btn-secondary mt-4" aria-label="Close error modal">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-secondary-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  poem.type === 'individual' 
                    ? 'bg-accent-100 text-accent-700' 
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {poem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'}
                </span>
                <span className="px-3 py-1 bg-secondary-100 rounded-full text-secondary-700 text-sm">
                  {poem.language}
                </span>
                {poem.featured && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Featured
                  </span>
                )}
                {currentViewMode === 'araz' && (
                  <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">
                    Araz Version
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-serif">
                {poem.type === 'individual' ? 'Individual Abyat' : 'Full Nazam'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="text-secondary-500 hover:text-secondary-700 text-lg font-medium"
              aria-label="Close poem details"
            >
              ✕
            </button>
          </div>

          {poem.arazContent && poem.status === 'araz_done' && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setCurrentViewMode('original')}
                className={`btn btn-sm flex items-center ${
                  currentViewMode === 'original' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
                aria-label="View original version"
              >
                <Eye size={16} className="mr-1" />
                Original Version
              </button>
              <button
                onClick={() => setCurrentViewMode('araz')}
                className={`btn btn-sm flex items-center ${
                  currentViewMode === 'araz' 
                    ? 'bg-success-600 text-white' 
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
                aria-label="View araz version"
              >
                <FileCheck size={16} className="mr-1" />
                Araz Version
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center">
                <Calendar size={18} className="text-secondary-500 mr-2" />
                <span className="text-secondary-600">Entry Date:</span>
                <span className="ml-2 font-medium">
                  {formatDistanceToNow(new Date(poem.entryDate), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center">
                {submissionInfo.icon}
                <span className="text-secondary-600 ml-2">Submission Method:</span>
                <span className="ml-2 font-medium">{submissionInfo.text}</span>
              </div>
              
              {submissionInfo.fileName && (
                <div className="flex items-center">
                  <FileText size={18} className="text-secondary-500 mr-2" />
                  <span className="text-secondary-600">File:</span>
                  <span className="ml-2 font-medium text-primary-600">{submissionInfo.fileName}</span>
                  {poem.submissionMethod === 'recording' && poem.audioFileName && (
                    <>
                      <button 
                        className="ml-2 p-1 text-accent-600 hover:text-accent-700"
                        onClick={toggleAudioPlayback}
                        aria-label={audioPlaying ? 'Pause audio' : 'Play audio'}
                      >
                        <Play size={16} />
                      </button>
                      <audio id="poem-audio" src={`${import.meta.env.VITE_API_URL}/api/files/${poem.audioFileName}`} />
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-secondary-600">Rating:</span>
                <div className="mt-1">
                  {renderStars()}
                </div>
              </div>
              
              <div className="flex items-center">
                {poem.status === 'araz_done' ? (
                  <>
                    <CheckCircle size={18} className="text-success-500 mr-2" />
                    <span className="text-success-600 font-medium">Araz Done</span>
                  </>
                ) : (
                  <>
                    <Clock size={18} className="text-warning-500 mr-2" />
                    <span className="text-warning-600 font-medium">Araz Pending</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">
              {currentViewMode === 'araz' ? 'Araz Version Content' : 'Original Content'}
            </h3>
            <div className={`poem-text bg-secondary-50 p-6 rounded-lg ${poem.language === 'Arabic' || poem.language === 'Urdu' ? 'rtl font-arabic' : ''}`}>
              {getDisplayContent()}
            </div>
          </div>
          
          {isAdmin && !poem.approved && (
            <div className="flex space-x-4 mb-8 p-4 bg-accent-700 rounded-lg">
              <button 
                onClick={onApprove}
                className="btn bg-success-500 text-white hover:bg-success-600 flex items-center"
                disabled={loading}
                aria-label={`Approve ${poem.type === 'individual' ? 'Abyat' : 'Nazam'}`}
              >
                <ThumbsUp size={18} className="mr-2" />
                Approve {poem.type === 'individual' ? 'Abyat' : 'Nazam'}
              </button>
              <button 
                onClick={onReject}
                className="btn bg-error-500 text-white hover:bg-error-600 flex items-center"
                disabled={loading}
                aria-label={`Reject ${poem.type === 'individual' ? 'Abyat' : 'Nazam'}`}
              >
                <ThumbsDown size={18} className="mr-2" />
                Reject {poem.type === 'individual' ? 'Abyat' : 'Nazam'}
              </button>
            </div>
          )}
          
          {(poem.fileName || poem.audioFileName) && (
            <div className="p-4 bg-primary-50 rounded-lg">
              <h4 className="font-medium mb-2">Attached File</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">
                  {poem.fileName || poem.audioFileName}
                </span>
                <button 
                  className="btn btn-primary btn-sm flex items-center"
                  onClick={handleDownload}
                  disabled={loading}
                  aria-label="Download attached file"
                >
                  <Download size={16} className="mr-1" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoemDetails;

function state<T>(_arg0: null): [any, any] {
  throw new Error('Function not implemented.');
}