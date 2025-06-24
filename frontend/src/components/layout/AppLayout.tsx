import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, PenTool, BookOpen, Award, Star, BookMarked, Shield, Eye, Feather, ClipboardCheck, CalendarRange } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/submit-poem', label: 'Submit Nazm', icon: <PenTool size={20} /> },
    { path: '/view-poems', label: 'My Nazms', icon: <BookOpen size={20} /> },
    { path: '/opening-verses', label: 'View Matale', icon: <CalendarRange size={20} /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <Award size={20} /> },
    { path: '/showcase', label: 'Featured Nazm', icon: <Star size={20} /> },
    ...(isAdmin() ? [
      { path: '/admin-review', label: 'Admin Review', icon: <Eye size={20} /> },
      { path: '/admin-opening-verses', label: 'Manage Matale', icon: <Feather size={20} /> },
      { path: '/admin-featured-poem', label: 'Admin Featured Nazm', icon: <ClipboardCheck size={20} /> },
      { path: '/admin-poem-checking', label: 'Admin Araz Management', icon: <Shield size={20} /> }
    ] : []),
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-secondary-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
            <div className="flex flex-col flex-1 pt-5 pb-4">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="flex items-center">
                  <BookMarked className="h-8 w-8 text-primary-600" />
                  <span className="ml-2 text-xl font-semibold text-primary-600">Insha Un Nazm</span>
                </div>
              </div>
              <nav className="mt-8 flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg w-full ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={`Navigate to ${item.label}`}
                    disabled={loggingOut}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {user?.name.charAt(0)}
                  </div>
                </div>
                <div className="ml-3 w-full">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user?.name}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center mt-1"
                    aria-label="Sign out"
                    disabled={loggingOut}
                  >
                    <LogOut size={12} className="mr-1" />
                    {loggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Mobile sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            {/* Mobile sidebar content */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setSidebarOpen(false);
                  }}
                  className="flex items-center focus:outline-none"
                  aria-label="Go to Dashboard"
                >
                  <BookMarked className="h-8 w-8 text-primary-600" />
                  <span className="ml-2 text-xl font-semibold text-primary-600">Insha Un Nazm</span>
                </button>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`group flex items-center px-4 py-2 text-base font-medium rounded-lg w-full ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={`Navigate to ${item.label}`}
                    disabled={loggingOut}
                  >
                    <span className="mr-4">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Mobile user section */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {user?.name.charAt(0)}
                  </div>
                </div>
                <div className="ml-3 w-full">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {user?.name}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center mt-1"
                    aria-label="Sign out"
                    disabled={loggingOut}
                  >
                    <LogOut size={12} className="mr-1" />
                    {loggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          <button
            className="md:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <h1 className="text-lg md:text-2xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-4 md:py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;