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
    const badge = document.getElementById('auth-badge');
    const updateBadge = () => {
      if (!badge) return;
      const rawUser = localStorage.getItem('decoshop_user');
      const token = localStorage.getItem('decoshop_token');
      if (!token) {
        badge.textContent = 'Déconnecté';
        badge.className = 'inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-900/30 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400';
        return;
      }
      let label = 'Connecté';
      try {
        const u = rawUser ? JSON.parse(rawUser) : null;
        if (u?.email) label = u.email;
      } catch {
        // ignore
      }
      badge.textContent = label;
      badge.className = 'inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400';
    };

    const token = localStorage.getItem('decoshop_token');
    if (!token) {
      updateBadge();
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
      .finally(() => {
        updateBadge();
        setChecking(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('decoshop_token');
    localStorage.removeItem('decoshop_user');
    setAuthed(false);

    const badge = document.getElementById('auth-badge');
    if (badge) {
      badge.textContent = 'Déconnecté';
      badge.className = 'inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-900/30 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400';
    }
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
