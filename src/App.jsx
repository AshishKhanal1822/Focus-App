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
import Profile from './components/Profile.jsx';
import NavProfile from './components/NavProfile.jsx';
// FocusTimer unused in this file, NavFocusTimer is used.
// imported NavFocusTimer is used.
import WelcomeAnimation from './components/WelcomeAnimation.jsx';
import { FocusManagerAgent } from './agents/focus/FocusManagerAgent.js';
import { NotificationAgent } from './agents/focus/NotificationAgent.js';
import { StorageAgent } from './agents/storage/StorageAgent.js';
import { AuthAgent } from './agents/auth/AuthAgent.js';
import NavFocusTimer from './components/NavFocusTimer.jsx';
import SupabaseAdapter from './agents/adapters/SupabaseAdapter.js';
import { eventBus } from './agents/core/EventBus.js';
import { useAgentEvent } from './hooks/useAgentEvent';

// Loading Spinner Component
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
    const focusAgent = new FocusManagerAgent();
    const notificationAgent = new NotificationAgent();
    const storageAgent = new StorageAgent();
    const authAgent = new AuthAgent();

    // Initialize storage first so it catches events
    storageAgent.init();
    authAgent.init();
    focusAgent.init();
    notificationAgent.init();

    return () => {
      focusAgent.destroy();
      notificationAgent.destroy();
      storageAgent.destroy();
      authAgent.destroy();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Listen for login events to show welcome animation
  useEffect(() => {
    let mounted = true;
    let sub = null;

    const checkInitialUser = async () => {
      const user = await SupabaseAdapter.getUser();
      if (mounted) {
        previousUserRef.current = user;
        setUser(user);
      }
    };
    checkInitialUser();

    try {
      const result = SupabaseAdapter.onAuthStateChange((event, session) => {
        if (mounted) {
          const newUser = session?.user || null;
          const previousUser = previousUserRef.current;

          // Show welcome animation if user just logged in (was null, now has user)
          if (!previousUser && newUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            setWelcomeUser(newUser);
            setShowWelcome(true);
          }
          setUser(newUser);

          previousUserRef.current = newUser;
        }
      });

      if (result && result.data && result.data.subscription) {
        sub = result.data.subscription;
      } else if (result && result.unsubscribe) {
        sub = result;
      }
    } catch (e) {
      // Auth listener error
    }

    return () => {
      mounted = false;
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      } else if (sub && sub.data && sub.data.subscription) {
        sub.data.subscription.unsubscribe();
      }
    };
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

  const handleFooterJoin = (e) => {
    e.preventDefault();
    eventBus.emit('SHOW_LOGIN');
  };

  return (
    <>
      {showWelcome && welcomeUser && (
        <WelcomeAnimation
          user={welcomeUser}
          onComplete={() => {
            setShowWelcome(false);
            setWelcomeUser(null);
          }}
        />
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
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
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

            <NavProfile />
          </div>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <NavFocusTimer />
              </li>
            </ul>
            {!isFocusActive && (
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link className={`nav-link px-3 ${location.pathname === '/' && !location.hash ? 'active' : ''}`} to="/" onClick={handleNavClick('/')}>Home</Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link px-3 ${location.pathname === '/features' ? 'active' : ''}`}
                    to="/features"
                    onClick={handleNavClick('/features')}
                  >
                    Features
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link px-3 ${location.pathname === '/about' ? 'active' : ''}`} to="/about" onClick={handleNavClick('/about')}>About</Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link px-3 ${location.pathname === '/faq' ? 'active' : ''}`} to="/faq" onClick={handleNavClick('/faq')}>FAQ</Link>
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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="page-transition-wrapper"
          >
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {!isFocusActive && (
        <footer className="py-5 mt-5 glass border-top-0">
          <div className="container">
            <div className="row g-4">
              <div className="col-md-4">
                <h4 className="fw-bold mb-3">Focus</h4>
                <p className="opacity-75">Elevate your productivity with our modern workspace tools. Built for the future of work.</p>
              </div>
              <div className="col-md-2 offset-md-1">
                <h6 className="fw-bold mb-3">Links</h6>
                <ul className="list-unstyled opacity-75">
                  <li><Link to="/" onClick={handleNavClick('/')} className="text-decoration-none text-current small">Home</Link></li>
                  <li><Link to="/features" onClick={handleNavClick('/features')} className="text-decoration-none text-current small">Features</Link></li>
                  <li><Link to="/library" onClick={handleNavClick('/library')} className="text-decoration-none text-current small">Library</Link></li>
                </ul>
              </div>
              <div className="col-md-2">
                <h6 className="fw-bold mb-3">Legal</h6>
                <ul className="list-unstyled opacity-75">
                  <li><Link to="/about" onClick={handleNavClick('/about')} className="text-decoration-none text-current small">Privacy Policy</Link></li>
                  <li><Link to="/about" onClick={handleNavClick('/about')} className="text-decoration-none text-current small">Terms of Service</Link></li>
                </ul>
              </div>
              <div className="col-md-3">
                <h6 className="fw-bold mb-3">Newsletter</h6>
                {!showFooterSuccess ? (
                  <form onSubmit={handleFooterJoin} className="input-group input-group-sm">
                    <input
                      type="email"
                      className="form-control glass text-current shadow-none"
                      placeholder="Email"
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