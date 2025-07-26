import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Navigate } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect authenticated users to dashboard, others to auth
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
};

export default Index;
