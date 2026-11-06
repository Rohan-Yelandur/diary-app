import React from 'react';
import './Sidebar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatEntryDate(isoString) {
  const d = new Date(isoString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3);
  return `${dayNames[d.getDay()]}, ${monthShort} ${d.getDate()}`;
}

export default function Sidebar({
  entries,
  selectedId,
  onSelectEntry,
  onNewEntry,
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  isNextDisabled,
  loadingEntries,
}) {
  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  // Sort entries newest first for display
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="sidebar">
      <button id="new-entry-btn" className="new-entry-btn" onClick={onNewEntry}>
        + New Entry
      </button>

      <div className="month-nav">
        <button
          id="prev-month-btn"
          className="month-nav-btn"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="month-label">{monthLabel}</span>
        <button
          id="next-month-btn"
          className="month-nav-btn"
          onClick={onNextMonth}
          disabled={isNextDisabled}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {loadingEntries ? (
        <div className="sidebar-loading">Loading entries…</div>
      ) : sorted.length === 0 ? (
        <div className="sidebar-empty">
          No entries for {monthLabel}.
        </div>
      ) : (
        <div className="entry-list">
          {sorted.map((entry) => {
            const isActive = entry.id === selectedId;
            const preview =
              entry.content && entry.content.length > 80
                ? entry.content.slice(0, 80) + '…'
                : entry.content;

            return (
              <div
                key={entry.id}
                className={`entry-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectEntry(entry.id)}
              >
                <div
                  className={`entry-item-title ${
                    !entry.title ? 'untitled' : ''
                  }`}
                >
                  {entry.title || 'Untitled'}
                </div>
                <div className="entry-item-date">
                  {formatEntryDate(entry.createdAt)}
                </div>
                {preview && (
                  <div className="entry-item-preview">{preview}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
