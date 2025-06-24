import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import SubmitPoemPage from './pages/SubmitPoemPage';
import ViewPoemsPage from './pages/ViewPoemsPage';
import OpeningVersesPage from './pages/OpeningVersesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BestPoemPage from './pages/BestPoemPage';
import ShowcasePage from './pages/ShowcasePage';
import AdminReviewPage from './pages/AdminReviewPage';
import AdminOpeningVersesPage from './pages/AdminOpeningVersesPage';
import AdminFeaturedPoemPage from './pages/AdminFeaturedPoemPage';
import AdminPoemCheckingPage from './pages/AdminPoemCheckingPage';

// Admin route protection
const AdminRoute: React.FC = () => {
  const { user, isAdmin } = useAuth();
  console.log('AdminRoute check:', { user, isAdmin: isAdmin() }); // Debug
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

// Not found page
const NotFound: React.FC = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-error-600">404 - Page Not Found</h1>
      <p className="mt-4 text-secondary-600">The page you’re looking for doesn’t exist.</p>
      <button
        className="mt-6 btn btn-primary"
        onClick={() => window.location.href = '/dashboard'}
      >
        Go to Dashboard
      </button>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-gray-50">
            <p className="text-secondary-600">Loading...</p>
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes for authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/submit-poem" element={<SubmitPoemPage />} />
              <Route path="/view-poems" element={<ViewPoemsPage />} />
              <Route path="/opening-verses" element={<OpeningVersesPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/best-poem" element={<BestPoemPage />} />
              <Route path="/showcase" element={<ShowcasePage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin-review" element={<AdminReviewPage />} />
              <Route path="/admin-opening-verses" element={<AdminOpeningVersesPage />} />
              <Route path="/admin-featured-poem" element={<AdminFeaturedPoemPage />} />
              <Route path="/admin-poem-checking" element={<AdminPoemCheckingPage />} />
            </Route>

            {/* Fallback for undefined routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;