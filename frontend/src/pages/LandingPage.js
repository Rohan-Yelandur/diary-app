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
          <span>My</span>Day
        </h1>
        <p className="landing-tagline">
          A quiet place to write. Your words live in your Google Drive.
        </p>

        <ul className="landing-features">
          <li>
            Your data lives in your own Google Drive — we never see it.
          </li>
          <li>
            One folder, one file per month. Simple and portable.
          </li>
          <li>
            Minimalist writing experience, nothing in your way.
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
