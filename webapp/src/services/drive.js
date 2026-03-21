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
    throw new Error(`Drive API error (${res.status}): ${body}`);
  }

  return res;
}

/**
 * Ensure the "MyDay - Diary App" folder exists.
 * Checks localStorage cache first, validates it still exists,
 * then searches or creates as needed.
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
  if (cachedId) {
    // Validate the cached folder still exists
    try {
      const res = await apiFetch(`${DRIVE_API}/files/${cachedId}?fields=id,trashed`);
      const data = await res.json();
      if (!data.trashed) return cachedId;
    } catch {
      // Cache is stale — continue to search
    }
    localStorage.removeItem('diaryAppFolderId');
  }

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
 * @returns {object|null} — parsed JSON data, or null if file doesn't exist
 */
export async function loadMonthFile(yearMonth, folderId) {
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

// ==========================================
// Image Attachments Logic
// ==========================================

let _imagesFolderPromise = null;

/**
 * Ensure the "Images" subfolder exists inside the main app folder.
 */
export function ensureImagesFolder(parentFolderId) {
  if (!parentFolderId) throw new Error('Parent folder ID required');
  if (_imagesFolderPromise) return _imagesFolderPromise;

  _imagesFolderPromise = _ensureImagesFolderImpl(parentFolderId).finally(() => {
    _imagesFolderPromise = null;
  });

  return _imagesFolderPromise;
}

async function _ensureImagesFolderImpl(parentFolderId) {
  const cachedId = localStorage.getItem('diaryAppImagesFolderId');
  if (cachedId) {
    try {
      const res = await apiFetch(`${DRIVE_API}/files/${cachedId}?fields=id,trashed`);
      const data = await res.json();
      if (!data.trashed) return cachedId;
    } catch {
      // cache stale
    }
    localStorage.removeItem('diaryAppImagesFolderId');
  }

  const query = `name='Images' and mimeType='${FOLDER_MIME}' and '${parentFolderId}' in parents and trashed=false`;
  const searchRes = await apiFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    const folderId = searchData.files[0].id;
    localStorage.setItem('diaryAppImagesFolderId', folderId);
    return folderId;
  }

  const createRes = await apiFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Images',
      parents: [parentFolderId],
      mimeType: FOLDER_MIME,
    }),
  });
  const folder = await createRes.json();
  localStorage.setItem('diaryAppImagesFolderId', folder.id);
  return folder.id;
}

/**
 * Upload an image File to the Images folder safely via resumable upload.
 */
export async function uploadImage(file, folderId) {
  const metadata = {
    name: file.name,
    parents: [folderId],
    mimeType: file.type,
  };

  // 1. Init resumable upload
  const initRes = await fetch(`${UPLOAD_API}/files?uploadType=resumable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!initRes.ok) throw new Error('Failed to init image upload');
  const uploadUrl = initRes.headers.get('Location');

  // 2. Upload actual binary data
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
  });

  if (!uploadRes.ok) throw new Error('Failed to upload image bytes');
  const data = await uploadRes.json();
  return data.id;
}

/**
 * Fetch an image from Drive and convert it into a local Object URL for an <img> tag.
 */
export async function fetchImageBlob(fileId) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch image data');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Permanently delete an image file from Drive.
 */
export async function deleteImage(fileId) {
  await apiFetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
  });
}
