/**
 * Google OAuth 2.0 Authentication Service
 *
 * Uses Google Identity Services (GIS) library.
 * Tokens are stored in memory only — never persisted to localStorage.
 */

const CLIENT_ID = '254580712324-391j6q5kflddke163o29rpf229af7p88.apps.googleusercontent.com'; // Replace with your Google OAuth Client ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let accessToken = sessionStorage.getItem('diary_access_token') || null;
let tokenExpiry = sessionStorage.getItem('diary_token_expiry') || null;

// Callbacks set by the AuthContext
let onAuthSuccess = null;
let onAuthError = null;

/**
 * Wait for the GIS library to load.
 */
function waitForGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (attempts > 50) {
        clearInterval(interval);
        reject(new Error('Google Identity Services library failed to load.'));
      }
    }, 100);
  });
}

/**
 * Initialize the token client. Must be called once on app load.
 */
export async function initGoogleAuth(successCallback, errorCallback) {
  onAuthSuccess = successCallback;
  onAuthError = errorCallback;

  await waitForGis();

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        if (onAuthError) onAuthError(response);
        return;
      }
      accessToken = response.access_token;
      // GIS returns expires_in in seconds
      tokenExpiry = Date.now() + response.expires_in * 1000;
      sessionStorage.setItem('diary_access_token', accessToken);
      sessionStorage.setItem('diary_token_expiry', tokenExpiry);
      if (onAuthSuccess) onAuthSuccess();
    },
  });
}

/**
 * Trigger the Google sign-in popup.
 */
export function signIn() {
  if (!tokenClient) {
    throw new Error('Auth not initialized. Call initGoogleAuth() first.');
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Sign out — revoke the token and clear in-memory state.
 */
export function signOut() {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiry = null;
  sessionStorage.removeItem('diary_access_token');
  sessionStorage.removeItem('diary_token_expiry');
  // Clear cached folder ID on sign-out
  localStorage.removeItem('diaryAppFolderId');
}

/**
 * Get the current access token.
 * If within 5 minutes of expiry, silently refresh.
 * Returns null if not authenticated.
 */
export function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (!accessToken) {
      resolve(null);
      return;
    }

    const fiveMinutes = 5 * 60 * 1000;
    if (tokenExpiry && Date.now() > tokenExpiry - fiveMinutes) {
      // Token is about to expire — refresh silently
      const originalSuccess = onAuthSuccess;
      onAuthSuccess = () => {
        onAuthSuccess = originalSuccess;
        resolve(accessToken);
      };
      const originalError = onAuthError;
      onAuthError = (err) => {
        onAuthError = originalError;
        reject(err);
      };
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      resolve(accessToken);
    }
  });
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated() {
  return !!accessToken && Date.now() < tokenExpiry;
}
