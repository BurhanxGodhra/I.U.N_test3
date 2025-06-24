import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Define user type
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  token: string;
}

// Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, country: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  isAdmin: () => false,
});

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

// Props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('poetry_user');
    const storedToken = localStorage.getItem('poetry_token');
    console.log('Stored token:', storedToken);
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      setUser({ ...parsedUser, token: storedToken });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password,
      });
      const { access_token, user: userData } = response.data;
      console.log('New login token:', access_token);
      const newUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        token: access_token,
      };
      setUser(newUser);
      localStorage.setItem('poetry_user', JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      }));
      localStorage.setItem('poetry_token', access_token);
      console.log('Stored token after login:', access_token);
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error('Invalid email or password');
    }
  };

  // Signup function
  const signup = async (name: string, email: string, password: string, country: string) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        name,
        email,
        password,
        country, // Include country in the request
      });
      const { access_token, user: userData } = response.data;
      const newUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        token: access_token,
      };
      setUser(newUser);
      localStorage.setItem('poetry_user', JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      }));
      localStorage.setItem('poetry_token', access_token);
    } catch (error) {
      throw new Error('Email already in use or invalid input');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('poetry_user');
    localStorage.removeItem('poetry_token');
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};