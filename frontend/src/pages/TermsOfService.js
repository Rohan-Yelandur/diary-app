import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPolicy.css';

export default function TermsOfService() {
  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <Link to="/" className="privacy-back privacy-back-top">← Back to home</Link>

        <h1 className="privacy-title">
          <span>My</span>Day Terms of Service
        </h1>
        <p className="privacy-updated">Last updated: November 5, 2026</p>

        <h2>Acceptance</h2>
        <p>
          By signing in to MyDay you agree to these terms. If you do not agree, please do not use
          the app.
        </p>

        <h2>The service</h2>
        <p>
          MyDay is a free, personal diary app that saves your entries to your own Google Drive.
          It is a hobby project provided as-is, without any warranty or guarantee of availability,
          accuracy, or data preservation. Features may change or the app may be discontinued at
          any time.
        </p>

        <h2>Your account and data</h2>
        <p>
          You are responsible for your Google account and for keeping your own backups. Your
          entries belong to you and are stored only in your Google Drive. MyDay does
          not store copies and cannot recover anything you delete.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Use MyDay only for lawful purposes and only with your own Google account. Do not attempt
          to interfere with, reverse engineer, or abuse the app or Google's services.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, MyDay and its developer are not liable for any
          loss of data, damages, or other harm arising from your use of the app.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may be updated from time to time. Continued use after a change means you
          accept the updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to ry7games@gmail.com.
        </p>

        <Link to="/" className="privacy-back">← Back to home</Link>
      </div>
    </div>
  );
}
