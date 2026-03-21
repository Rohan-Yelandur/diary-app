import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ensureAppFolder, loadMonthFile, saveMonthFile, ensureImagesFolder, deleteImage } from '../services/drive';
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
  const [imagesFolderId, setImagesFolderId] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Cache file IDs for each month
  const [fileIdCache, setFileIdCache] = useState({});

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
        .then((id) => {
          setFolderId(id);
          return ensureImagesFolder(id);
        })
        .then((imgId) => setImagesFolderId(imgId))
        .catch((err) => {
          showToast('Could not access Google Drive. Check your connection.', 'error');
          console.error(err);
        });
    }
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load entries when month or folder changes
  useEffect(() => {
    if (!folderId) return;

    const yearMonth = toYearMonthStr(currentYear, currentMonth);
    setLoadingEntries(true);
    setSelectedId(null);
    setShowEditor(false);

    loadMonthFile(yearMonth, folderId)
      .then((data) => {
        if (data) {
          // Backfill id for legacy entries that don't have one
          const entriesWithIds = (data.entries || []).map((e) => ({
            ...e,
            id: e.id || generateId(),
          }));
          setEntries(entriesWithIds);
          setFileIdCache((prev) => ({ ...prev, [yearMonth]: data._fileId }));
        } else {
          setEntries([]);
        }
        setLoadingEntries(false);
      })
      .catch((err) => {
        showToast('Could not load entries. Check your connection.', 'error');
        console.error(err);
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
      images: [],
    };

    // If we navigated away from the current month, snap back
    const entryDate = new Date(nowISO);
    const entryYear = entryDate.getFullYear();
    const entryMonth = entryDate.getMonth();
    
    if (entryYear !== currentYear || entryMonth !== currentMonth) {
      setCurrentYear(entryYear);
      setCurrentMonth(entryMonth);
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
    async (id, newTitle, newContent, newCreatedAt, newImages) => {
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
        images: newImages || oldEntry.images || [],
      };

      if (!isCrossMonthMove) {
        // 1. STANDARD SAVE (Same Month)
        const updatedEntries = entries.map((e) => (e.id === id ? updatedEntry : e));
        setEntries(updatedEntries);

        const fileData = {
          month: currentViewYearMonth,
          entries: updatedEntries.map(({ id, createdAt, title, content, images }) => ({
            id, createdAt, title, content, images: images || [],
          })),
        };

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
        setSelectedId(null);
        setShowEditor(false);

        try {
          // Save current month file (now without the entry)
          const currentFileData = {
            month: currentViewYearMonth,
            entries: currentEntriesRemoved.map(({ id, createdAt, title, content, images }) => ({
              id, createdAt, title, content, images: images || [],
            })),
          };
          const existingFileId = fileIdCache[currentViewYearMonth] || null;
          const currentSavedId = await saveMonthFile(currentViewYearMonth, currentFileData, folderId, existingFileId);
          setFileIdCache((prev) => ({ ...prev, [currentViewYearMonth]: currentSavedId }));

          // Load target month file
          let targetEntries = [];
          let targetExistingId = fileIdCache[targetYearMonth] || null;
          const targetData = await loadMonthFile(targetYearMonth, folderId);
          
          if (targetData) {
            targetEntries = targetData.entries || [];
            targetExistingId = targetData._fileId;
          }
          
          targetEntries.push(updatedEntry);
          
          const targetFileData = {
            month: targetYearMonth,
            entries: targetEntries.map(({ id, createdAt, title, content, images }) => ({
              id, createdAt, title, content, images: images || [],
            })),
          };

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
    [entries, currentYear, currentMonth, folderId, fileIdCache, showToast]
  );

  // ---- Delete Entry ----
  const handleDelete = useCallback(
    async (id) => {
      // Delete attached images from Drive
      const entryToDelete = entries.find((e) => e.id === id);
      if (entryToDelete && entryToDelete.images && entryToDelete.images.length > 0) {
        entryToDelete.images.forEach((imgId) => {
          deleteImage(imgId).catch((err) => console.error('Failed to clean up image', err));
        });
      }

      const yearMonth = toYearMonthStr(currentYear, currentMonth);
      const existingFileId = fileIdCache[yearMonth] || null;

      const updatedEntries = entries.filter((e) => e.id !== id);
      setEntries(updatedEntries);

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

      const fileData = {
        month: yearMonth,
        entries: updatedEntries.map(({ id, createdAt, title, content, images }) => ({
          id,
          createdAt,
          title,
          content,
          images: images || [],
        })),
      };

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
          imagesFolderId={imagesFolderId}
        />
      </main>
    </div>
  );
}
