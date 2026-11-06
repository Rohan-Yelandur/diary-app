import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ensureAppFolder, loadMonthFile, saveMonthFile, invalidateFolderCache } from '../services/drive';
import { toLocalISOString } from '../utils/date';
import Sidebar from '../components/Sidebar';
import Editor from '../components/Editor';
import './DiaryApp.css';

function generateId() {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function toYearMonthStr(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// Backfill id for legacy entries that don't have one
function withIds(entries) {
  return (entries || []).map((e) => ({ ...e, id: e.id || generateId() }));
}

// Strip to the fields that get written to Drive
function toFileEntries(entries) {
  return entries.map(({ id, createdAt, title, content }) => ({ id, createdAt, title, content }));
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DiaryApp() {
  const { authenticated, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const now = getCurrentYearMonth();
  const [currentYear, setCurrentYear] = useState(now.year);
  const [currentMonth, setCurrentMonth] = useState(now.month);
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Cache file IDs for each month
  const [fileIdCache, setFileIdCache] = useState({});
  // Cache loaded entries per month so revisits cost no API calls
  const [monthCache, setMonthCache] = useState({});
  // A new entry created while viewing another month, to append after snapping back
  const pendingNewEntryRef = useRef(null);
  // Guards against looping if folder recovery itself fails
  const folderRecoveredRef = useRef(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !authenticated) {
      navigate('/?reason=session_expired');
    }
  }, [loading, authenticated, navigate]);

  // Init: ensure folder exists
  useEffect(() => {
    if (authenticated) {
      ensureAppFolder()
        .then((id) => setFolderId(id))
        .catch((err) => {
          showToast('Could not access Google Drive. Check your connection.', 'error');
          console.error(err);
        });
    }
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // If a request 404s, the cached folder ID is stale. Re-resolve once and let
  // the month effect re-run with the new folderId.
  const recoverFolder = useCallback(async () => {
    if (folderRecoveredRef.current) return false;
    folderRecoveredRef.current = true;
    invalidateFolderCache();
    setFileIdCache({});
    setMonthCache({});
    const id = await ensureAppFolder();
    setFolderId(id);
    return true;
  }, []);

  // Load entries when month or folder changes
  useEffect(() => {
    if (!folderId) return;

    const yearMonth = toYearMonthStr(currentYear, currentMonth);
    setSelectedId(null);
    setShowEditor(false);

    const applyLoaded = (loaded) => {
      const pending = pendingNewEntryRef.current;
      pendingNewEntryRef.current = null;
      if (pending) {
        setEntries([...loaded, pending]);
        setSelectedId(pending.id);
        setShowEditor(true);
      } else {
        setEntries(loaded);
      }
    };

    // Cache hit: no network
    if (monthCache[yearMonth]) {
      applyLoaded(monthCache[yearMonth]);
      return;
    }

    setLoadingEntries(true);
    loadMonthFile(yearMonth, folderId, fileIdCache[yearMonth] || null)
      .then((data) => {
        const loaded = data ? withIds(data.entries) : [];
        if (data) {
          setFileIdCache((prev) => ({ ...prev, [yearMonth]: data._fileId }));
        }
        setMonthCache((prev) => ({ ...prev, [yearMonth]: loaded }));
        applyLoaded(loaded);
        setLoadingEntries(false);
      })
      .catch(async (err) => {
        console.error(err);
        if (err.status === 404 && (await recoverFolder().catch(() => false))) {
          return; // effect re-runs with the fresh folderId
        }
        showToast('Could not load entries. Check your connection.', 'error');
        setEntries([]);
        setLoadingEntries(false);
      });
  }, [folderId, currentYear, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Month Navigation ----
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = getCurrentYearMonth();
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const normalizedMonth = nextMonth > 11 ? 0 : nextMonth;

    if (nextYear > now.year || (nextYear === now.year && normalizedMonth > now.month)) {
      return; // Don't navigate to future
    }

    setCurrentYear(nextYear);
    setCurrentMonth(normalizedMonth);
  };

  const isNextDisabled = (() => {
    const now = getCurrentYearMonth();
    if (currentYear > now.year) return true;
    if (currentYear === now.year && currentMonth >= now.month) return true;
    return false;
  })();

  // ---- New Entry ----
  const handleNewEntry = () => {
    const nowISO = toLocalISOString();
    const newEntry = {
      id: generateId(),
      createdAt: nowISO,
      title: '',
      content: '',
    };

    // If we navigated away from the current month, snap back
    const entryDate = new Date(nowISO);
    const entryYear = entryDate.getFullYear();
    const entryMonth = entryDate.getMonth();
    
    if (entryYear !== currentYear || entryMonth !== currentMonth) {
      // The month effect will load the target month and then append this entry
      pendingNewEntryRef.current = newEntry;
      setCurrentYear(entryYear);
      setCurrentMonth(entryMonth);
      return;
    }

    setEntries((prev) => [...prev, newEntry]);
    setSelectedId(newEntry.id);
    setShowEditor(true);
  };

  // ---- Select Entry ----
  const handleSelectEntry = (id) => {
    setSelectedId(id);
    setShowEditor(true);
  };

  // ---- Save Entry ----
  const handleSave = useCallback(
    async (id, newTitle, newContent, newCreatedAt) => {
      const currentViewYearMonth = toYearMonthStr(currentYear, currentMonth);
      const oldEntry = entries.find((e) => e.id === id);
      if (!oldEntry) return;

      const finalCreatedAt = newCreatedAt || oldEntry.createdAt;
      const targetYearMonth = finalCreatedAt.substring(0, 7);
      const isCrossMonthMove = currentViewYearMonth !== targetYearMonth;

      const updatedEntry = {
        ...oldEntry,
        title: newTitle,
        content: newContent,
        createdAt: finalCreatedAt,
      };

      if (!isCrossMonthMove) {
        // 1. STANDARD SAVE (Same Month)
        const updatedEntries = entries.map((e) => (e.id === id ? updatedEntry : e));
        setEntries(updatedEntries);
        setMonthCache((prev) => ({ ...prev, [currentViewYearMonth]: updatedEntries }));

        const fileData = { month: currentViewYearMonth, entries: toFileEntries(updatedEntries) };

        try {
          const existingFileId = fileIdCache[currentViewYearMonth] || null;
          const savedFileId = await saveMonthFile(currentViewYearMonth, fileData, folderId, existingFileId);
          setFileIdCache((prev) => ({ ...prev, [currentViewYearMonth]: savedFileId }));
        } catch (err) {
          showToast('Could not save entry. Check your connection.', 'error');
          console.error(err);
          throw err;
        }
      } else {
        // 2. CROSS-MONTH MOVE
        const currentEntriesRemoved = entries.filter((e) => e.id !== id);
        setEntries(currentEntriesRemoved);
        setMonthCache((prev) => ({ ...prev, [currentViewYearMonth]: currentEntriesRemoved }));
        setSelectedId(null);
        setShowEditor(false);

        try {
          // Save current month file (now without the entry)
          const currentFileData = { month: currentViewYearMonth, entries: toFileEntries(currentEntriesRemoved) };
          const existingFileId = fileIdCache[currentViewYearMonth] || null;
          const currentSavedId = await saveMonthFile(currentViewYearMonth, currentFileData, folderId, existingFileId);
          setFileIdCache((prev) => ({ ...prev, [currentViewYearMonth]: currentSavedId }));

          // Load target month: from cache if we have it, otherwise from Drive
          let targetEntries;
          let targetExistingId = fileIdCache[targetYearMonth] || null;
          if (monthCache[targetYearMonth]) {
            targetEntries = [...monthCache[targetYearMonth]];
          } else {
            const targetData = await loadMonthFile(targetYearMonth, folderId, targetExistingId);
            targetEntries = targetData ? withIds(targetData.entries) : [];
            if (targetData) targetExistingId = targetData._fileId;
          }

          targetEntries.push(updatedEntry);
          setMonthCache((prev) => ({ ...prev, [targetYearMonth]: targetEntries }));

          const targetFileData = { month: targetYearMonth, entries: toFileEntries(targetEntries) };
          const targetSavedId = await saveMonthFile(targetYearMonth, targetFileData, folderId, targetExistingId);
          setFileIdCache((prev) => ({ ...prev, [targetYearMonth]: targetSavedId }));
          
          showToast(`Entry moved to ${targetYearMonth}`, 'success');
        } catch (err) {
          showToast('Could not move entry across months. Check your connection.', 'error');
          console.error(err);
          throw err;
        }
      }
    },
    [entries, currentYear, currentMonth, folderId, fileIdCache, monthCache, showToast]
  );

  // ---- Delete Entry ----
  const handleDelete = useCallback(
    async (id) => {
      const yearMonth = toYearMonthStr(currentYear, currentMonth);
      const existingFileId = fileIdCache[yearMonth] || null;

      const updatedEntries = entries.filter((e) => e.id !== id);
      setEntries(updatedEntries);
      setMonthCache((prev) => ({ ...prev, [yearMonth]: updatedEntries }));

      // Select next available entry
      if (updatedEntries.length > 0) {
        const sorted = [...updatedEntries].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setSelectedId(sorted[0].id);
      } else {
        setSelectedId(null);
        setShowEditor(false);
      }

      const fileData = { month: yearMonth, entries: toFileEntries(updatedEntries) };

      try {
        const savedFileId = await saveMonthFile(yearMonth, fileData, folderId, existingFileId);
        setFileIdCache((prev) => ({ ...prev, [yearMonth]: savedFileId }));
      } catch (err) {
        showToast('Could not delete entry. Check your connection.', 'error');
        console.error(err);
      }
    },
    [entries, currentYear, currentMonth, folderId, fileIdCache, showToast]
  );

  // ---- Mobile Back ----
  const handleBack = () => {
    setShowEditor(false);
  };

  // ---- Sign Out ----
  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="diary-loading">
        <div className="diary-loading-spinner" />
        Loading…
      </div>
    );
  }

  const selectedEntry = entries.find((e) => e.id === selectedId) || null;

  const emptyMessage =
    entries.length === 0
      ? `No entries for ${MONTH_NAMES[currentMonth]} ${currentYear}. Hit '+ New Entry' to start.`
      : 'Select an entry or create a new one.';

  return (
    <div className="diary-app">
      <header className="diary-header">
        <div className="diary-header-title">
          <span>My</span>Day
        </div>
        <button id="sign-out-btn" className="sign-out-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <main className={`diary-main ${showEditor ? 'show-editor' : ''}`}>
        <Sidebar
          entries={entries}
          selectedId={selectedId}
          onSelectEntry={handleSelectEntry}
          onNewEntry={handleNewEntry}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          isNextDisabled={isNextDisabled}
          loadingEntries={loadingEntries}
        />
        <Editor
          entry={selectedEntry}
          onSave={handleSave}
          onDelete={handleDelete}
          onBack={handleBack}
          emptyMessage={selectedEntry ? null : emptyMessage}
        />
      </main>
    </div>
  );
}
