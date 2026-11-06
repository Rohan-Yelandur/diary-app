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

        <h2>Overview</h2>
        <p>
          MyDay ("the app", "we") is a personal diary web app available at
          https://trymyday.vercel.app. This policy explains what data the app accesses, how it is
          used, and what we do and do not collect. MyDay runs entirely in your web browser. We
          operate no backend server and no database of our own.
        </p>

        <h2>Information we collect</h2>
        <p>
          We do not collect, store, transmit, or sell any personal information. Specifically:
        </p>
        <ul>
          <li>We do not collect your name, email address, or Google profile information.</li>
          <li>We do not store copies of your diary entries anywhere other than your own Google Drive.</li>
          <li>We do not use cookies, analytics, tracking pixels, or advertising.</li>
          <li>We do not keep server logs, because there is no server.</li>
        </ul>

        <h2>Google user data we access</h2>
        <p>
          When you sign in with Google, the app requests one OAuth permission:
          <code>https://www.googleapis.com/auth/drive.file</code>. This scope allows the app to
          create, read, and modify only the files and folders that the app itself creates. It does
          not grant access to any other files in your Google Drive.
        </p>
        <p>Using this permission, the app creates and manages the following in your Google Drive:</p>
        <ul>
          <li>A folder named "MyDay - Diary App" in the root of your Drive.</li>
          <li>One JSON file per month (for example 2026-11.json) containing your entries' titles, text, and timestamps.</li>
          <li>A README.txt file describing the folder.</li>
        </ul>

        <h2>How Google user data is used</h2>
        <p>
          Your Google Drive data is used for one purpose only: to save and load your diary entries
          so that you can read and edit them in the app. The data is transferred
          directly between your browser and Google's servers over HTTPS. It is never sent to us or
          to any third party.
        </p>

        <h2>Sharing of Google user data</h2>
        <p>
          We do not share, transfer, or disclose Google user data to anyone. There are no third
          parties involved in the operation of the app other than Google itself, whose handling of
          your Drive data is governed by Google's own privacy policy.
        </p>

        <h2>Limited Use disclosure</h2>
        <p>
          MyDay's use of information received from Google APIs adheres to the
          {' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements. We only use Google user data to provide
          the diary features you see in the app. We do not use it for advertising, we do not sell
          it, and no human reads it except as required by law or with your explicit consent.
        </p>

        <h2>Data storage, security, and retention</h2>
        <p>
          All diary data is stored exclusively in your own Google Drive and is protected by your
          Google account's security. The Google access token used to talk to Drive is held in your
          browser's memory only. It is never written to disk or browser storage, expires
          automatically within about one hour, and is revoked when you sign out or discarded when
          you close the page.
        </p>
        <p>
          Because we hold no copies of your data, we retain nothing. Your data persists only as
          long as you keep it in your Google Drive.
        </p>

        <h2>Deleting your data and revoking access</h2>
        <ul>
          <li>Delete entries from inside the app, or delete the "MyDay - Diary App" folder directly in Google Drive to remove everything.</li>
          <li>Revoke the app's access at any time from your Google Account at
            {' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>. Revoking access does not delete files already in your Drive; you remain in full control of them.
          </li>
        </ul>

        <h2>Children's privacy</h2>
        <p>
          MyDay is not directed at children under 13, and we do not knowingly collect information
          from them. Since we collect no information from anyone, no special handling applies.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes, the updated version will be posted at this address with a new
          "Last updated" date.
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
