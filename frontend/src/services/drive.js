/**
 * Google Drive API v3 Service
 *
 * Handles: MyDay - Diary App folder creation, monthly JSON file read/write.
 * All calls use the access token from auth.js.
 */

import { getAccessToken } from './auth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'MyDay - Diary App';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Helper: make an authenticated fetch to Google APIs.
 */
async function apiFetch(url, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Drive API error (${res.status}): ${body}`);
    err.status = res.status;
    throw err;
  }

  return res;
}

/**
 * Forget the cached folder ID. Call this when a request fails with 404,
 * which means the folder was deleted or moved since it was cached.
 */
export function invalidateFolderCache() {
  localStorage.removeItem('diaryAppFolderId');
}

/**
 * Ensure the "MyDay - Diary App" folder exists.
 * Trusts the localStorage cache without a validation request; callers
 * should invalidateFolderCache() and retry if a later call returns 404.
 * Otherwise searches or creates as needed.
 * Uses a singleton promise to prevent concurrent calls from creating duplicates.
 * Returns the folder's fileId.
 */
let _folderPromise = null;

export function ensureAppFolder() {
  if (_folderPromise) return _folderPromise;

  _folderPromise = _ensureAppFolderImpl().finally(() => {
    _folderPromise = null;
  });

  return _folderPromise;
}

async function _ensureAppFolderImpl() {
  // 1. Check localStorage cache
  const cachedId = localStorage.getItem('diaryAppFolderId');
  if (cachedId) return cachedId;

  // 2. Search for existing folder
  const query = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  const searchRes = await apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    const folderId = searchData.files[0].id;
    localStorage.setItem('diaryAppFolderId', folderId);
    return folderId;
  }

  // 3. Create the folder
  const createRes = await apiFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: FOLDER_MIME,
    }),
  });
  const folder = await createRes.json();
  localStorage.setItem('diaryAppFolderId', folder.id);

  // Generate README to prevent user tampering
  createReadmeFile(folder.id).catch(console.error);

  return folder.id;
}

/**
 * Creates a README.txt file inside the newly created App Folder
 * warning users against manual modification.
 */
async function createReadmeFile(folderId) {
  const content = `Welcome to MyDay!

These JSON files contain your diary entries.

⚠️ IMPORTANT WARNING ⚠️
Please DO NOT modify, rename, or delete these files manually.
Doing so may corrupt your diary data and cause the app to break.

To edit your entries, simply use the MyDay web app.`;

  const metadata = {
    name: 'README.txt',
    parents: [folderId],
    mimeType: 'text/plain',
  };

  const boundary = '---readme-boundary---';
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  await apiFetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });
}

/**
 * Load a monthly JSON file from Drive.
 * @param {string} yearMonth — e.g. "2026-03"
 * @param {string} folderId — the Diary App folder ID
 * @param {string|null} knownFileId — if the file's ID is already known, skip the search
 * @returns {object|null} — parsed JSON data, or null if file doesn't exist
 */
export async function loadMonthFile(yearMonth, folderId, knownFileId = null) {
  // Fast path: download directly when the ID is cached (1 request instead of 2)
  if (knownFileId) {
    try {
      const res = await apiFetch(`${DRIVE_API}/files/${knownFileId}?alt=media`);
      const data = await res.json();
      return { ...data, _fileId: knownFileId };
    } catch (err) {
      if (err.status !== 404) throw err;
      // File was removed since it was cached — fall through to a search
    }
  }

  const fileName = `${yearMonth}.json`;
  const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
  const searchRes = await apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`
  );
  const searchData = await searchRes.json();

  if (!searchData.files || searchData.files.length === 0) {
    return null;
  }

  const fileId = searchData.files[0].id;
  const contentRes = await apiFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  const data = await contentRes.json();
  return { ...data, _fileId: fileId };
}

/**
 * Save (create or update) a monthly JSON file to Drive.
 * @param {string} yearMonth — e.g. "2026-03"
 * @param {object} data — the full month data object { month, entries }
 * @param {string} folderId — the Diary App folder ID
 * @param {string|null} existingFileId — if updating, the file's Drive ID
 * @returns {string} — the file ID
 */
export async function saveMonthFile(yearMonth, data, folderId, existingFileId = null) {
  const fileName = `${yearMonth}.json`;
  const fileContent = JSON.stringify(data, null, 2);

  const boundary = '---diary-boundary---';
  const contentType = 'application/json';

  if (existingFileId) {
    // Update existing file — PATCH with media upload
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name: fileName })}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${contentType}\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const res = await apiFetch(
      `${UPLOAD_API}/files/${existingFileId}?uploadType=multipart&fields=id`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      }
    );
    const result = await res.json();
    return result.id;
  } else {
    // Create new file
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: contentType,
    };

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${contentType}\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const res = await apiFetch(
      `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      }
    );
    const result = await res.json();
    return result.id;
  }
}
