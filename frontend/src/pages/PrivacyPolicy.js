import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <Link to="/" className="privacy-back privacy-back-top">← Back to home</Link>

        <h1 className="privacy-title">
          <span>My</span>Day Privacy Policy
        </h1>
        <p className="privacy-updated">Last updated: November 5, 2026</p>

        <h2>What MyDay is</h2>
        <p>
          MyDay is a diary web app that stores your entries in your own Google Drive.
          It runs entirely in your browser. There is no MyDay server and no MyDay database.
        </p>

        <h2>What we access</h2>
        <p>
          When you sign in with Google, MyDay requests the <code>drive.file</code> permission.
          This lets the app create and edit only the files it creates itself: a folder named
          "MyDay - Diary App", one JSON file per month of entries, and any images you attach.
          MyDay cannot see any other files in your Drive.
        </p>

        <h2>What we collect</h2>
        <p>
          Nothing. Your diary entries, images, and Google account details never leave your browser
          except to be saved to your Google Drive. We do not collect, store, log, or share any
          personal data, and we do not use analytics or advertising.
        </p>

        <h2>How sign-in works</h2>
        <p>
          Sign-in is handled by Google. MyDay receives a short-lived access token that is kept in
          memory only and discarded when you close or refresh the page. Signing out revokes it.
        </p>

        <h2>Your control</h2>
        <p>
          Your data is yours. You can view, edit, or delete the MyDay folder in Google Drive at
          any time, and you can revoke MyDay's access from your Google Account permissions page.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to ry7games@gmail.com.
        </p>

        <Link to="/" className="privacy-back">← Back to home</Link>
      </div>
    </div>
  );
}
