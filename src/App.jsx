import { useState, useEffect, useRef, Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

// Lazy loaded components
const Home = lazy(() => import('./Home'));
const Contact = lazy(() => import('./contact'));
const Features = lazy(() => import('./Features'));
const About = lazy(() => import('./About'));
const Testimonials = lazy(() => import('./Testimonials'));
const GetStarted = lazy(() => import('./GetStarted'));
const Library = lazy(() => import('./Library'));
const Writing = lazy(() => import('./Writing'));
const Dashboard = lazy(() => import('./Dashboard'));
const Admin = lazy(() => import('./Admin'));
const StudyPlanner = lazy(() => import('./StudyPlanner'));
const DistractionDashboard = lazy(() => import('./DistractionDashboard'));

import ScrollToTop from './ScrollToTop';
import MusicPlayer from './components/MusicPlayer.jsx';
import FocusToast from './components/FocusToast.jsx';
const Profile = lazy(() => import('./components/Profile.jsx'));
const WelcomeAnimation = lazy(() => import('./components/WelcomeAnimation.jsx'));
import NavProfile from './components/NavProfile.jsx';
import NavFocusTimer from './components/NavFocusTimer.jsx';
import adminStore from './utils/adminStore.js';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { eventBus } from './agents/core/EventBus.js';
import { useAgentEvent } from './hooks/useAgentEvent';
import { initAppAgents } from './agents/index.js';

// Loading Spinner Component
// Subtle Top Loading Bar
const PageLoader = () => (
  <div className="position-fixed top-0 start-0 w-100" style={{ zIndex: 9999, height: '3px' }}>
    <motion.div
      initial={{ width: "0%" }}
      animate={{ width: "100%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="h-100 bg-primary shadow-sm"
      style={{ boxShadow: '0 0 10px var(--primary)' }}
    />
  </div>
);

function AppContent({ theme, toggleTheme }) {
  const focusState = useAgentEvent('FOCUS_STATE_UPDATED', { status: 'idle' });
  const isFocusActive = focusState?.status === 'running';
  const location = useLocation();
  const navigate = useNavigate();
  const [footerEmail, setFooterEmail] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showFooterSuccess, setShowFooterSuccess] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [user, setUser] = useState(null);
  const previousUserRef = useRef(null);
  const initialAuthHandledRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(adminStore.isAdminLoggedIn());

  useEffect(() => {
    const unsubAdmin = eventBus.on('ADMIN_AUTH_CHANGED', (status) => {
      setIsAdmin(status);
    });
    return unsubAdmin;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  // Close nav on route change
  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const unsub = eventBus.on('SYNC_COMPLETED', () => {
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialise agents once for the app lifecycle
  useEffect(() => {
    initAppAgents();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Real-time cross-device profile sync
  useEffect(() => {
    let channel = null;

    if (user?.id) {
      channel = SupabaseAdapter.subscribeToProfile(user.id, (payload) => {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          // Merge real-time DB changes into the current user object
          return {
            ...prevUser,
            user_metadata: {
              ...prevUser.user_metadata,
              full_name: payload.full_name || prevUser.user_metadata.full_name,
              avatar_url: payload.avatar_url || prevUser.user_metadata.avatar_url
            }
          };
        });
      });
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [user?.id]);

  // Authoritative User State Sync
  useEffect(() => {
    const unsubscribe = SupabaseAdapter.subscribe((enrichedUser) => {
      const previouslyUnauthenticated = !previousUserRef.current;

      if (!initialAuthHandledRef.current) {
        previousUserRef.current = enrichedUser;
        setUser(enrichedUser);
        initialAuthHandledRef.current = true;
        return;
      }

      setUser(enrichedUser);

      if (previouslyUnauthenticated && enrichedUser) {
        setWelcomeUser(enrichedUser);
        setShowWelcome(true);
      }

      previousUserRef.current = enrichedUser;
    });

    return unsubscribe;
  }, []);

  const handleNavClick = (path) => (e) => {
    if (location.hash) {
      navigate(path, { replace: true });
    }

    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrefetch = (path) => () => {
    switch (path) {
      case '/features': import('./Features'); break;
      case '/about': import('./About'); break;
      case '/library': import('./Library'); break;
      case '/writing': import('./Writing'); break;
      case '/dashboard': import('./Dashboard'); break;
      case '/planner': import('./StudyPlanner'); break;
      case '/admin': import('./Admin'); break;
      default: break;
    }
  };

  const handleFooterJoin = (e) => {
    e.preventDefault();
    eventBus.emit('SHOW_LOGIN');
  };

  return (
    <>
      {showWelcome && welcomeUser && (
        <Suspense fallback={null}>
          <WelcomeAnimation
            user={welcomeUser}
            onComplete={() => {
              setShowWelcome(false);
              setWelcomeUser(null);
            }}
          />
        </Suspense>
      )}
      {/* Ambient Glows */}
      <div className="ambient-glow">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
      </div>

      <nav 
        className="navbar navbar-expand-lg sticky-top nav-glass shadow-sm" 
        style={{ 
          padding: '0.75rem 0',
          transition: 'backdrop-filter 0.3s ease, background-color 0.3s ease, border 0.3s ease' 
        }}
      >
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/" onClick={handleNavClick('/')}>Focus</Link>

          <div className="d-flex align-items-center order-lg-last ms-2">
            <button
              className="navbar-toggler ms-2"
              type="button"
              onClick={toggleNav}
              aria-expanded={isNavOpen}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <button
              className="theme-toggle ms-2 btn border-0 p-0"
              onClick={toggleTheme}
              style={{ cursor: 'pointer', background: 'none' }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {!isOnline && (
              <>
                <span className="badge bg-danger ms-2 rounded-pill px-3 d-none d-lg-inline-block">
                  Offline
                </span>
                <span className="text-danger ms-2 d-lg-none" title="You are offline">
                  <WifiOff size={20} />
                </span>
              </>
            )}
            {showSyncSuccess && (
              <span className="badge bg-success ms-2 rounded-pill px-3 animate-fade-in d-none d-lg-inline-block">
                Synced!
              </span>
            )}

            <NavProfile />
          </div>

          <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''}`} id="navbarNav">
            {!isAdmin && !['/about', '/contact', '/features', '/testimonials'].includes(location.pathname) && (
              <ul className="navbar-nav mx-auto">
                <li className="nav-item">
                  <NavFocusTimer />
                </li>
              </ul>
            )}
            {!isFocusActive && (
              <ul className="navbar-nav ms-auto">
                {/* When admin is logged in, show ONLY the Admin Panel link */}
                {isAdmin ? (
                  <li className="nav-item">
                    <Link
                      className={`nav-link px-3 fw-bold text-primary ${location.pathname === '/admin' ? 'active' : ''}`}
                      to="/admin"
                      onClick={handleNavClick('/admin')}
                      onMouseEnter={handlePrefetch('/admin')}
                    >
                      ⚡ Admin Panel
                    </Link>
                  </li>
                ) : (
                  <>
                    <li className="nav-item">
                      <Link
                        className={`nav-link px-3 ${location.pathname === '/' && !location.hash ? 'active' : ''}`}
                        to="/"
                        onClick={handleNavClick('/')}
                        onMouseEnter={handlePrefetch('/')}
                      >
                        Home
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        className={`nav-link px-3 ${location.pathname === '/features' ? 'active' : ''}`}
                        to="/features"
                        onClick={handleNavClick('/features')}
                        onMouseEnter={handlePrefetch('/features')}
                      >
                        Features
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        className={`nav-link px-3 ${location.pathname === '/about' ? 'active' : ''}`}
                        to="/about"
                        onClick={handleNavClick('/about')}
                        onMouseEnter={handlePrefetch('/about')}
                      >
                        About
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link
                        className={`nav-link px-3 ${location.pathname === '/planner' ? 'active' : ''}`}
                        to="/planner"
                        onClick={handleNavClick('/planner')}
                        onMouseEnter={handlePrefetch('/planner')}
                      >
                        AI Planner
                      </Link>
                    </li>

                    {user && (
                      <li className="nav-item">
                        <Link
                          className={`nav-link px-3 ${location.pathname === '/distraction' ? 'active' : ''}`}
                          to="/distraction"
                          onClick={handleNavClick('/distraction')}
                          onMouseEnter={() => import('./DistractionDashboard')}
                        >
                          Focus Analysis
                        </Link>
                      </li>
                    )}
                    {!user && (
                      <li className="nav-item">
                        <Link className={`nav-link px-3 ${location.pathname === '/contact' ? 'active' : ''}`} to="/contact" onClick={handleNavClick('/contact')}>Contact</Link>
                      </li>
                    )}
                  </>
                )}
              </ul>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content" id="main-content">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="page-transition-wrapper"
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/contact" element={!user ? <Contact /> : <Home />} />
                <Route path="/get-started" element={<GetStarted />} />
                <Route path="/library" element={<Library />} />
                <Route path="/writing" element={<Writing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/planner" element={<StudyPlanner user={user} />} />
                <Route path="/distraction" element={!user ? <Navigate to="/" /> : <DistractionDashboard />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isFocusActive && !isAdmin && (
        <footer className="py-5 mt-5 glass border-top-0">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-4">
                <h2 className="fw-bold mb-3 fs-4">Focus</h2>
                <p className="opacity-75">Elevate your productivity with our modern workspace tools. Built for the future of work.</p>
              </div>
              <div className="col-md-3 offset-md-2">
                <h3 className="fw-bold mb-3 fs-6">Home</h3>
                <ul className="list-unstyled opacity-75">
                  <li className="mb-2"><Link to="/" onClick={handleNavClick('/')} className="text-decoration-none text-current small">Overview</Link></li>
                  <li className="mb-2"><Link to="/features" onClick={handleNavClick('/features')} className="text-decoration-none text-current small">Features</Link></li>
                  <li className="mb-2"><Link to="/library" onClick={handleNavClick('/library')} className="text-decoration-none text-current small">Library</Link></li>
                </ul>
              </div>
              {!user && (
              <div className="col-md-3">
                <h3 className="fw-bold mb-3 fs-6">Newsletter</h3>
                {!showFooterSuccess ? (
                  <form onSubmit={handleFooterJoin} className="input-group input-group-sm">
                    <input
                      type="email"
                      className="form-control glass text-current shadow-none"
                      placeholder="Email"
                      aria-label="Newsletter Email"
                      required
                      value={footerEmail}
                      onChange={(e) => setFooterEmail(e.target.value)}
                      disabled={isJoining}
                    />
                    <button type="submit" className="btn btn-primary" disabled={isJoining}>
                      {isJoining ? '...' : 'Join'}
                    </button>
                  </form>
                ) : (
                  <div className="text-success small d-flex align-items-center gap-2 animate-fade-in">
                    <span className="fw-bold">Successfully joined!</span>
                  </div>
                )}
              </div>
              )}
            </div>
            <hr className="my-4 opacity-25" />
            <div className="text-center opacity-50 small">
              &copy; 2025 Focus. Elevate your productivity.
            </div>
          </div>
        </footer>
      )}
      <ScrollToTop />
      {!isAdmin && <MusicPlayer />}
      <FocusToast />
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router>
      <AppContent
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </Router>
  )
}

export default App;