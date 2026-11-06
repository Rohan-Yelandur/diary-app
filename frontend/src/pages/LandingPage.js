import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { authenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'session_expired';

  const handleClick = () => {
    if (authenticated) {
      navigate('/app');
    } else {
      signIn();
    }
  };

  return (
    <div className="landing-page">
      {sessionExpired && (
        <div className="session-expired-banner">
          Your session expired. Please sign in again.
        </div>
      )}

      <div className="landing-content">
        <h1 className="landing-app-name">
          <img src="/myday-logo-light.png" alt="" className="landing-logo" />
          <span>My</span>Day
        </h1>
        <p className="landing-tagline">
          Your day. Your words.
        </p>

        <ul className="landing-features">
          <li>
            Your data lives in your own Google Drive, no one else ever sees it.
          </li>
          <li>
            All your data is stored in json, easily extractable.
          </li>
          <li>
            A Minimalist writing experience, with nothing in your way.
          </li>
        </ul>

        <button
          id="landing-cta"
          className="landing-btn landing-btn-primary"
          onClick={handleClick}
        >
          {authenticated ? 'Open my diary →' : 'Sign in with Google'}
        </button>
      </div>

      <footer className="landing-footer">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
      </footer>
    </div>
  );
}
