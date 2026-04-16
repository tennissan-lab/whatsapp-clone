import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Auth from './pages/Auth';
import MainLayout from './pages/MainLayout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
