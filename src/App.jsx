import './App.css'
import { useState, useEffect } from "react"
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './Home';
import Contact from './contact';
import Features from './Features';
import About from './About';
import FAQ from './FAQ';
import Testimonials from './Testimonials';
import GetStarted from './GetStarted';
import Library from './Library';
import ScrollToTop from './ScrollToTop';

function AppContent({ theme, toggleTheme, deferredPrompt, handleInstall }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleNavClick = (path) => (e) => {
    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg nav-glass sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/" onClick={handleNavClick('/')}>Focus</Link>

          <div className="d-flex align-items-center order-lg-last ms-2">
            <button
              className="theme-toggle btn btn-link text-decoration-none me-2"
              onClick={toggleTheme}
              title="Toggle Theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            <button
              className="navbar-toggler ms-2"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link px-3" to="/" onClick={handleNavClick('/')}>Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-3" to="/features" onClick={handleNavClick('/features')}>Features</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-3" to="/about" onClick={handleNavClick('/about')}>About</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-3" to="/faq" onClick={handleNavClick('/faq')}>FAQ</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-3" to="/contact" onClick={handleNavClick('/contact')}>Contact</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/library" element={<Library />} />
        </Routes>
      </div>

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
              <div className="input-group input-group-sm">
                <input type="email" className="form-control glass" placeholder="Email" />
                <button className="btn btn-primary">Join</button>
              </div>
            </div>
          </div>
          <hr className="my-4 opacity-25" />
          <div className="text-center opacity-50 small">
            &copy; 2025 Focus. Elevate your productivity.
          </div>
        </div>
      </footer>
      <ScrollToTop />
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <Router>
      <AppContent
        theme={theme}
        toggleTheme={toggleTheme}
        deferredPrompt={deferredPrompt}
        handleInstall={handleInstall}
      />
    </Router>
  )
}

export default App;