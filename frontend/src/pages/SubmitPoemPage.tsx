import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, X, Info, Upload, PenTool, BookOpen, Mic, FileText, Volume2 } from 'lucide-react';
import axios from 'axios';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { OpeningVerse } from '../types/verse';

type PoemType = 'individual' | 'full' | null;
type SubmissionMethod = 'upload' | 'recording' | 'manual' | null;

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">Something went wrong</h3>
          <p className="text-error-600 mb-4">Please try again later</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SubmitPoemPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [poemType, setPoemType] = useState<PoemType>(null);
  const [language, setLanguage] = useState<'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu'>('English');
  const [inspiredByVerse, setInspiredByVerse] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>(null);
  const [content, setContent] = useState('');
  const [currentVerses, setCurrentVerses] = useState<OpeningVerse[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    content?: string;
    file?: string;
    audio?: string;
    verse?: string;
  }>({});

  // Set writing direction based on language
  const textDirection = language === 'Arabic' || language === 'Lisan al-Dawah' || language === 'Urdu' ? 'rtl' : 'ltr';
  
  // Fetch opening verses from API
  useEffect(() => {
    const fetchVerses = async () => {
      if (!user?.token) {
        setError('Please log in to fetch Matale');
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/verses`, { // Centralized API call
          headers: { Authorization: `Bearer ${user.token}` },
          params: { language },
        });
        setCurrentVerses(response.data.map((verse: any) => ({
          id: verse.id,
          text: verse.content || '', // Ensure text is mapped from content
          author: verse.author || '',
          language: verse.language || 'Unknown',
          day: verse.day || 1,
          createdAt: verse.createdAt || new Date().toISOString(),
        })));
      } catch (err: any) {
        setError('Failed to fetch Matale');
        console.error('Fetch Matale error:', {
          message: err.message,
          response: err.response?.data || 'No response data',
          status: err.response?.status || 'No status',
        });
      }
    };
    fetchVerses();
  }, [language, user?.token]);
  
  const validateForm = () => {
    const newErrors: {
      content?: string;
      file?: string;
      audio?: string;
      verse?: string;
    } = {};
    
    if (!inspiredByVerse) {
      newErrors.verse = 'Please select a Matla for your Nazm';
    }
    
    if (submissionMethod === 'manual' && !content.trim()) {
      newErrors.content = 'Nazm content is required';
    } else if (submissionMethod === 'manual' && content.trim().length < 20) {
      newErrors.content = 'Nazm is too short (minimum 20 characters)';
    }
    
    if (submissionMethod === 'upload' && !selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }
    
    if (submissionMethod === 'recording' && !audioFile) {
      newErrors.audio = 'Please select an audio file to upload';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.token) {
      setError('Please log in and complete the form');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (submissionMethod === 'manual') {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/poems/manual`, // Centralized API call
          {
            type: poemType,
            content,
            language,
            submissionMethod,
            inspiredBy: inspiredByVerse,
          },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } else if (submissionMethod === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('poem_json', JSON.stringify({
          type: poemType,
          language,
          submissionMethod,
          inspiredBy: inspiredByVerse,
        }));
        await axios.post(`${import.meta.env.VITE_API_URL}/api/poems/upload`, formData, { // Centralized API call
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (submissionMethod === 'recording' && audioFile) {
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('poem_json', JSON.stringify({
          type: poemType,
          language,
          submissionMethod,
          inspiredBy: inspiredByVerse,
        }));
        await axios.post(`${import.meta.env.VITE_API_URL}/api/poems/upload`, formData, { // Centralized API call
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/view-poems');
      }, 3000);
    } catch (err: any) {
      setError('Failed to submit Nazm. Please try again.');
      console.error('Submit Nazm error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setPoemType(null);
    setLanguage('English');
    setInspiredByVerse('');
    setSubmissionMethod(null);
    setContent('');
    setSelectedFile(null);
    setAudioFile(null);
    setErrors({});
    setError(null);
  };
  
  return (
    <AppLayout title="Submit a Nazm">
      <div className="max-w-4xl mx-auto">
        {submitSuccess ? (
          <div className="bg-success-500 text-black p-6 rounded-lg mb-6 animate-fade-in">
            <h3 className="text-xl font-semibold mb-2">Thank you for your submission!</h3>
            <p>Your {poemType === 'individual' ? 'Individual Abyat' : 'Full Nazam'} has been sent for review.</p>
            <div className="mt-4 flex space-x-4">
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-500"
              >
                Submit Another Nazm
              </button>
              <button 
                onClick={() => navigate('/view-poems')}
                className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-500"
              >
                View Submitted Nazms
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-error-100 text-error-700 p-4 rounded-lg mb-6">
                  {error}
                </div>
              )}
              {loading && (
                <div className="text-center py-4">
                  <p className="text-secondary-600">Submitting your Nazm...</p>
                </div>
              )}
              {/* Step 1: Poem Type Selection */}
              {!poemType && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-6 text-center">Choose Your Submission Type</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                      className="bg-white p-8 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary-500 group"
                      onClick={() => setPoemType('individual')}
                    >
                      <div className="flex items-center justify-center mb-4">
                        <BookOpen size={48} className="text-primary-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="text-xl font-semibold text-center mb-2">Individual Abyat</h3>
                      <p className="text-center text-secondary-600">
                        Submit individual Abyat or couplets
                      </p>
                    </div>
                    
                    <div
                      className="bg-white p-8 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary-500 group"
                      onClick={() => setPoemType('full')}
                    >
                      <div className="flex items-center justify-center mb-4">
                        <FileText size={48} className="text-primary-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="text-xl font-semibold text-center mb-2">Full Nazam</h3>
                      <p className="text-center text-secondary-600">
                        Submit a complete Nazam
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Language and Opening Verse Selection */}
              {poemType && !submissionMethod && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                      {poemType === 'individual' ? 'Individual Abyat' : 'Full Nazam'} - Language & Matla
                    </h3>
                    
                    <div className="mb-6">
                      <label htmlFor="language" className="form-label">Select Language</label>
                      <select
                        id="language"
                        className="form-input"
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value as 'English' | 'French' | 'Arabic' | 'Lisan al-Dawah' | 'Urdu');
                          setInspiredByVerse('');
                        }}
                      >
                        <option value="English">English</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Urdu">Urdu</option>
                        <option value="Lisan al-Dawah">Lisan al-Dawah</option>
                        <option value="French">French</option>
                      </select>
                    </div>
                  </div>

                  {/* Opening Verses Selection */}
                  <div className="bg-primary-50 p-6 rounded-lg mb-6">
                    <div className="flex items-start mb-4">
                      <Info size={20} className="text-primary-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-primary-800">Select Matla</h3>
                        <p className="text-primary-700 text-sm">
                          Choose one of the Matla in {language} to write your {poemType === 'individual' ? 'abyat' : 'nazam'}.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {(currentVerses.length > 0 ? currentVerses : []).map((verse) => (
                        <div 
                          key={verse.id}
                          className={`p-4 bg-white rounded-md cursor-pointer hover:shadow-md transition-all border-2 ${
                            inspiredByVerse === verse.id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent hover:border-primary-300'
                          }`}
                          onClick={() => setInspiredByVerse(verse.id)}
                        >
                          <div className={`font-serif italic text-lg mb-2 whitespace-pre-wrap ${textDirection === 'rtl' ? 'text-right' : ''}`} dir={textDirection}>
                            {verse.text || 'No content available'}
                          </div>
                          <div className="flex justify-between items-center text-sm text-secondary-600">
                            <span>— {verse.author || 'N/A'}</span>
                            <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Day {verse.day}</span>
                          </div>
                        </div>
                      ))}
                      
                      {currentVerses.length === 0 && (
                        <p className="text-center text-secondary-500 py-4">
                          No Matla available for the selected language.
                        </p>
                      )}
                    </div>
                    
                    {errors.verse && (
                      <p className="mt-2 text-sm text-error-600">{errors.verse}</p>
                    )}
                  </div>

                  {/* Submission Method Selection */}
                  {inspiredByVerse && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4">Choose Submission Method</h3>
                      <div className={`grid gap-6 ${poemType === 'individual' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div
                          className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary-500 group"
                          onClick={() => setSubmissionMethod('upload')}
                        >
                          <div className="flex items-center justify-center mb-4">
                            <Upload size={40} className="text-primary-600 group-hover:scale-110 transition-transform" />
                          </div>
                          <h4 className="text-lg font-semibold text-center mb-2">Upload File</h4>
                          <p className="text-center text-secondary-600 text-sm">
                            Upload your {poemType === 'individual' ? 'abyat' : 'nazam'} from a text file
                          </p>
                        </div>
                        
                        {poemType === 'individual' && (
                          <div
                            className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary-500 group"
                            onClick={() => setSubmissionMethod('recording')}
                          >
                            <div className="flex items-center justify-center mb-4">
                              <Mic size={40} className="text-accent-600 group-hover:scale-110 transition-transform" />
                            </div>
                            <h4 className="text-lg font-semibold text-center mb-2">Upload Recording</h4>
                            <p className="text-center text-secondary-600 text-sm">
                              Upload an audio recording of your abyat
                            </p>
                          </div>
                        )}
                        
                        <div
                          className="bg-white p-6 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary-500 group"
                          onClick={() => setSubmissionMethod('manual')}
                        >
                          <div className="flex items-center justify-center mb-4">
                            <PenTool size={40} className="text-secondary-600 group-hover:scale-110 transition-transform" />
                          </div>
                          <h4 className="text-lg font-semibold text-center mb-2">Type Manually</h4>
                          <p className="text-center text-secondary-600 text-sm">
                            Write your {poemType === 'individual' ? 'abyat' : 'nazam'} directly in the editor
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Content Submission */}
              {submissionMethod && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">
                      {poemType === 'individual' ? 'Individual Abyat' : 'Full Nazam'} - 
                      {submissionMethod === 'upload' ? ' File Upload' : 
                       submissionMethod === 'recording' ? ' Audio Recording' : ' Manual Entry'}
                    </h3>
                    <p className="text-secondary-600 text-sm mb-4">
                      Language: {language} | Inspired by: {currentVerses.find(v => v.id === inspiredByVerse)?.author || 'Unknown'}
                    </p>
                  </div>

                  {submissionMethod === 'manual' && (
                    <div>
                      <label htmlFor="content" className="form-label">
                        {poemType === 'individual' ? 'Abyat' : 'Nazam'} Content
                      </label>
                      <textarea
                        id="content"
                        className={`form-input min-h-[300px] font-arabic text-lg leading-relaxed ${
                          errors.content ? 'border-error-500 ring-1 ring-error-500' : ''
                        }`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        dir={textDirection}
                        placeholder={`Write your ${poemType === 'individual' ? 'abyat' : 'nazam'} here...`}
                      ></textarea>
                      {errors.content && (
                        <p className="mt-1 text-sm text-error-600">{errors.content}</p>
                      )}
                    </div>
                  )}
                  
                  {submissionMethod === 'upload' && (
                    <div>
                      <label htmlFor="file" className="form-label">Upload {poemType === 'individual' ? 'Abyat' : 'Nazam'} File</label>
                      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        errors.file ? 'border-error-500' : 'border-secondary-300'
                      }`}>
                        <input
                          type="file"
                          id="file"
                          accept=".txt,.doc,.docx,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file" className="cursor-pointer">
                          <Upload size={32} className="mx-auto mb-2 text-secondary-400" />
                          <p className="text-secondary-600">
                            {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-sm text-secondary-500 mt-1">
                            Supported formats: TXT, DOC, DOCX, PDF
                          </p>
                        </label>
                        {errors.file && (
                          <p className="mt-2 text-sm text-error-600">{errors.file}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {submissionMethod === 'recording' && (
                    <div>
                      <label htmlFor="audio" className="form-label">Upload Audio Recording</label>
                      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        errors.audio ? 'border-error-500' : 'border-accent-300'
                      }`}>
                        <input
                          type="file"
                          id="audio"
                          accept=".mp3,.wav,.m4a,.ogg"
                          onChange={handleAudioChange}
                          className="hidden"
                        />
                        <label htmlFor="audio" className="cursor-pointer">
                          <Volume2 size={32} className="mx-auto mb-2 text-accent-500" />
                          <p className="text-secondary-600">
                            {audioFile ? audioFile.name : 'Click to upload your audio recording'}
                          </p>
                          <p className="text-sm text-secondary-500 mt-1">
                            Supported formats: MP3, WAV, M4A, OGG
                          </p>
                        </label>
                        {errors.audio && (
                          <p className="mt-2 text-sm text-error-600">{errors.audio}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-secondary flex items-center"
                      disabled={loading}
                    >
                      <X size={18} className="mr-2" />
                      Start Over
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex items-center"
                      disabled={loading}
                    >
                      <Send size={18} className="mr-2" />
                      Submit {poemType === 'individual' ? 'Abyat' : 'Nazam'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </ErrorBoundary>
        )}
      </div>
    </AppLayout>
  );
};

export default SubmitPoemPage;