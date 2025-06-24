import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenTool, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState(''); // New state for country
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !country) { // Include country in validation
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        name,
        email,
        password,
        country, // Send country to the backend
      }, {
        timeout: 10000, // 10-second timeout
      });
      
      // Auto-login after signup
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection or server status.';
      } else if (err.response) {
        errorMessage = err.response.data?.detail || err.message;
      }
      setError(errorMessage);
      console.error('Signup error:', {
        message: err.message,
        code: err.code,
        response: err.response,
        config: err.config,
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white bg-opacity-20 mb-4">
              <PenTool className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white font-serif">INSHA UN NAZM</h1>
            <p className="text-primary-100 mt-1">ASHARAH MUBARAKAH 1447</p>
          </div>
          
          {/* Form */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-center mb-6">Create your account</h2>
            
            {error && (
              <div className="bg-error-100 text-error-600 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="form-label">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    className="form-input pl-10"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="form-label">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="form-input pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="country" className="form-label">Country</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="country"
                    type="text"
                    className="form-input pl-10"
                    placeholder="Enter your country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    className="form-input pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-secondary-500">
                  Password must be at least 6 characters
                </p>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary w-full mb-4 flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
              
              <div className="text-center text-sm text-secondary-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-800 font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;