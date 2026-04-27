import { useState, useEffect } from 'react';
import { ToastProvider } from './Toast';
import { ThemeProvider } from './ThemeProvider';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';

export default function App() {
  const [authed, setAuthed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('decoshop_token');
  });
  const [checking, setChecking] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('decoshop_token');
    if (!token) {
      setChecking(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('decoshop_token');
          localStorage.removeItem('decoshop_user');
          setAuthed(false);
        }
      })
      .catch(() => {
        // Offline — keep token, trust local state
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('decoshop_token');
    localStorage.removeItem('decoshop_user');
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <Dashboard onLogout={handleLogout} />
      </ToastProvider>
    </ThemeProvider>
  );
}
