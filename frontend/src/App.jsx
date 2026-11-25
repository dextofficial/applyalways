import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, getToken, setToken, APP_NAME } from './api.js';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Plans from './pages/Plans.jsx';
import PaymentCallback from './pages/PaymentCallback.jsx';
import Applications from './pages/Applications.jsx';
import Notifications from './pages/Notifications.jsx';
import Admin from './pages/Admin.jsx';
import PublicLayout from './pages/PublicLayout.jsx';
import Landing from './pages/Landing.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Contact from './pages/Contact.jsx';
import { ThemeProvider, ThemeToggle } from './Theme.jsx';

const Ctx = createContext(null);
export const useMe = () => useContext(Ctx);

function PublicHome() {
  const { me } = useMe();
  if (getToken()) {
    if (!me) return <div className="center">Loading…</div>;
    return <Navigate to={me.user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <PublicLayout><Landing /></PublicLayout>;
}

function Shell() {
  const { me, refresh } = useMe();
  const nav = useNavigate();
  if (!getToken()) return <Navigate to="/login" replace />;
  if (!me) return <div className="center">Loading…</div>;
  if (me.user.role === 'admin') return <Navigate to="/admin" replace />;
  const logout = () => { setToken(null); nav('/login'); };
  return (
    <div className="shell">
      <header className="top user-top">
        <b className="brand-mark">{APP_NAME}</b>
        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/dashboard">Home</NavLink>
          <NavLink to="/applications">Applications</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/plans">Plans</NavLink>
          <NavLink to="/notifications" onClick={refresh}>Alerts{me.stats.unread > 0 && <span className="dot">{me.stats.unread}</span>}</NavLink>
        </nav>
        <ThemeToggle />
        <button className="link logout-link" onClick={logout}>Log out</button>
      </header>
      <main className="page"><Outlet /></main>
      <nav className="tabs" aria-label="Main navigation">
        <NavLink to="/dashboard">Home</NavLink>
        <NavLink to="/applications">Applied</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        <NavLink to="/plans">Plans</NavLink>
        <NavLink to="/notifications" onClick={refresh}>Alerts{me.stats.unread > 0 && <span className="dot">{me.stats.unread}</span>}</NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const refresh = useCallback(async () => {
    if (!getToken()) return setMe(null);
    try { setMe(await api('/me')); } catch { setMe(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <ThemeProvider>
      <Ctx.Provider value={{ me, refresh }}>
        <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/admin/login" element={<Auth mode="login" admin />} />
        <Route path="/admin" element={<Admin />} />
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Ctx.Provider>
    </ThemeProvider>
  );
}
