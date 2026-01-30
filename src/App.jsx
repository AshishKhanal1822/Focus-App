import { useState, useEffect, useRef, Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy loaded components
const Home = lazy(() => import('./Home'));
const Contact = lazy(() => import('./contact'));
const Features = lazy(() => import('./Features'));
const About = lazy(() => import('./About'));
const FAQ = lazy(() => import('./FAQ'));
const Testimonials = lazy(() => import('./Testimonials'));
const GetStarted = lazy(() => import('./GetStarted'));
const Library = lazy(() => import('./Library'));
const Writing = lazy(() => import('./Writing'));

import ScrollToTop from './ScrollToTop';
const Profile = lazy(() => import('./components/Profile.jsx'));
const WelcomeAnimation = lazy(() => import('./components/WelcomeAnimation.jsx'));
import NavProfile from './components/NavProfile.jsx';
import NavFocusTimer from './components/NavFocusTimer.jsx';
// Agents are initialized dynamically in useEffect to optimize initial load
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { eventBus } from './agents/core/EventBus.js';
import { useAgentEvent } from './hooks/useAgentEvent';

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
    let agents = {};

    const initAgents = async () => {
      // Dynamic imports to keep initial bundle tiny
      const [
        { FocusManagerAgent },
        { NotificationAgent },
        { StorageAgent },
        { AuthAgent },
        SyncAg
      ] = await Promise.all([
        import('./agents/focus/FocusManagerAgent.js'),
        import('./agents/focus/NotificationAgent.js'),
        import('./agents/storage/StorageAgent.js'),
        import('./agents/auth/AuthAgent.js'),
        import('./agents/core/SyncAgent.js')
      ]);

      agents.focusAgent = new FocusManagerAgent();
      agents.notificationAgent = new NotificationAgent();
      agents.storageAgent = new StorageAgent();
      agents.authAgent = new AuthAgent();

      agents.storageAgent.init();
      agents.authAgent.init();
      agents.focusAgent.init();
      agents.notificationAgent.init();
      SyncAg.default.init();
    };

    initAgents();

    return () => {
      if (agents.focusAgent) agents.focusAgent.destroy();
      if (agents.notificationAgent) agents.notificationAgent.destroy();
      if (agents.storageAgent) agents.storageAgent.destroy();
      if (agents.authAgent) agents.authAgent.destroy();
      // SyncAgent destroy is typically static or handled locally
    };
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
    // This single subscription replaces all manual auth listeners in this file.
    // It automatically handles initial state, logins, logouts, and token refreshes
    // using the centralized enrichment logic in SupabaseAdapter.
    const unsubscribe = SupabaseAdapter.subscribe((enrichedUser) => {
      const previouslyUnauthenticated = !previousUserRef.current;

      // Skip the very first callback on mount (initial cached state),
      // so we don't show the welcome animation on page reload.
      if (!initialAuthHandledRef.current) {
        previousUserRef.current = enrichedUser;
        setUser(enrichedUser);
        initialAuthHandledRef.current = true;
        return;
      }

      setUser(enrichedUser);

      // Trigger welcome animation only on true login transition (null -> user)
      if (previouslyUnauthenticated && enrichedUser) {
        setWelcomeUser(enrichedUser);
        setShowWelcome(true);
      }

      previousUserRef.current = enrichedUser;
    });

    return unsubscribe;
  }, []);

  const handleNavClick = (path) => (e) => {
    // Clear hash for non-features navigation to reset indicators
    if (location.hash) {
      navigate(path, { replace: true });
    }

    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrefetch = (path) => () => {
    // Manually trigger dynamic imports on hover to prime the browser cache
    switch (path) {
      case '/features': import('./Features'); break;
      case '/about': import('./About'); break;
      case '/faq': import('./FAQ'); break;
      case '/library': import('./Library'); break;
      case '/writing': import('./Writing'); break;
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

      <nav className="navbar navbar-expand-lg nav-glass sticky-top">
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
              <span className="badge bg-danger ms-2 rounded-pill px-3">
                Offline
              </span>
            )}
            {showSyncSuccess && (
              <span className="badge bg-success ms-2 rounded-pill px-3 animate-fade-in">
                Synced!
              </span>
            )}

            <NavProfile />
          </div>

          <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''}`} id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <NavFocusTimer />
              </li>
            </ul>
            {!isFocusActive && (
              <ul className="navbar-nav ms-auto">
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
                    className={`nav-link px-3 ${location.pathname === '/faq' ? 'active' : ''}`}
                    to="/faq"
                    onClick={handleNavClick('/faq')}
                    onMouseEnter={handlePrefetch('/faq')}
                  >
                    FAQ
                  </Link>
                </li>
                {!user && (
                  <li className="nav-item">
                    <Link className={`nav-link px-3 ${location.pathname === '/contact' ? 'active' : ''}`} to="/contact" onClick={handleNavClick('/contact')}>Contact</Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content" id="main-content">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="popLayout">
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
                <Route path="/faq" element={<FAQ />} />
                <Route path="/testimonials" element={<Testimonials />} />
                <Route path="/contact" element={!user ? <Contact /> : <Home />} />
                <Route path="/get-started" element={<GetStarted />} />
                <Route path="/library" element={<Library />} />
                <Route path="/writing" element={<Writing />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      {!isFocusActive && (
        <footer className="py-5 mt-5 glass border-top-0">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-4">
                <h2 className="fw-bold mb-3 fs-4">Focus</h2>
                <p className="opacity-75">Elevate your productivity with our modern workspace tools. Built for the future of work.</p>
              </div>
              <div className="col-md-2 offset-md-1">
                <h3 className="fw-bold mb-3 fs-6">Links</h3>
                <ul className="list-unstyled opacity-75">
                  <li><Link to="/" onClick={handleNavClick('/')} className="text-decoration-none text-current small">Home</Link></li>
                  <li><Link to="/features" onClick={handleNavClick('/features')} className="text-decoration-none text-current small">Features</Link></li>
                  <li><Link to="/library" onClick={handleNavClick('/library')} className="text-decoration-none text-current small">Library</Link></li>
                </ul>
              </div>
              <div className="col-md-2">
                <h3 className="fw-bold mb-3 fs-6">Legal</h3>
                <ul className="list-unstyled opacity-75">
                  <li><Link to="/about" onClick={handleNavClick('/about')} className="text-decoration-none text-current small">Privacy Policy</Link></li>
                  <li><Link to="/about" onClick={handleNavClick('/about')} className="text-decoration-none text-current small">Terms of Service</Link></li>
                </ul>
              </div>
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
            </div>
            <hr className="my-4 opacity-25" />
            <div className="text-center opacity-50 small">
              &copy; 2025 Focus. Elevate your productivity.
            </div>
          </div>
        </footer>
      )}
      <ScrollToTop />
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