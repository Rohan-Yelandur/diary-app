import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toLocalISOString } from '../utils/date';
import HomeScreen from './HomeScreen';
import './Editor.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Parse ISO string into local date parts
 */
function parseDate(isoString) {
  const d = new Date(isoString);
  return {
    year: d.getFullYear(),
    month: d.getMonth(), // 0-indexed
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

/**
 * Build ISO string from local date parts
 */
function buildIso(parts) {
  const d = new Date(parts.year, parts.month, parts.day, parts.hour, parts.minute);
  return toLocalISOString(d);
}

/**
 * Format for display
 */
function formatTimestamp(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Generate a grid of days for the calendar
 */
function getDaysGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const numDays = new Date(year, month + 1, 0).getDate();
  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let i = 1; i <= numDays; i++) grid.push(i);
  return grid;
}

/**
 * Custom Select Component to allow max-height and width styling
 * which native <select> elements do not support
 */
function CustomSelect({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  
  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When open, auto-scroll to the selected element
  useEffect(() => {
    if (isOpen && ref.current) {
      const selectedEl = ref.current.querySelector('.custom-select-option.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-select" ref={ref}>
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        {selectedOption.label}
        <span className="arrow"></span>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((o) => (
            <div 
              key={o.value} 
              className={`custom-select-option ${value === o.value ? 'selected' : ''}`}
              onClick={() => { 
                onChange(o.value); 
                setIsOpen(false); 
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Custom inline date/time picker (Calendar + Time Dropdowns)
 */
function DateTimePicker({ dateParts, onChange, onClose }) {
  const pickerRef = useRef(null);
  const [tab, setTab] = useState('date'); // 'date' | 'time'

  // Calendar View State
  const [viewYear, setViewYear] = useState(dateParts.year);
  const [viewMonth, setViewMonth] = useState(dateParts.month);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const update = (field, value) => {
    onChange({ ...dateParts, [field]: value });
  };

  const handleDayClick = (d) => {
    onChange({ ...dateParts, year: viewYear, month: viewMonth, day: d });
    setTab('time'); // Auto-switch to time
  };

  const isPM = dateParts.hour >= 12;
  const display12 = dateParts.hour === 0 ? 12 : dateParts.hour > 12 ? dateParts.hour - 12 : dateParts.hour;

  const toggleAMPM = (pm) => {
    if (isPM === pm) return;
    const isNow12 = display12 === 12;
    let h24;
    if (pm) {
      h24 = isNow12 ? 12 : display12 + 12;
    } else {
      h24 = isNow12 ? 0 : display12;
    }
    update('hour', h24);
  };

  const renderCalendar = () => {
    const grid = getDaysGrid(viewYear, viewMonth);
    return (
      <div className="picker-calendar">
        <div className="calendar-header">
          <button onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
            else setViewMonth(m => m - 1);
          }}>❮</button>
          <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
            else setViewMonth(m => m + 1);
          }}>❯</button>
        </div>
        <div className="calendar-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
          {grid.map((d, i) => {
            const isSelected = d === dateParts.day && viewMonth === dateParts.month && viewYear === dateParts.year;
            return (
              <div
                key={i}
                className={`cal-cell ${d === null ? 'empty' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => d !== null && handleDayClick(d)}
              >
                {d || ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeDropdowns = () => {
    const hourOptions = Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: String(i + 1)
    }));

    const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
      value: i,
      label: String(i).padStart(2, '0')
    }));

    return (
      <div className="picker-time-dropdowns">
        <div className="date-picker-row" style={{ justifyContent: 'center', margin: '20px 0' }}>
          <div className="date-picker-field date-picker-field-sm">
            <label className="date-picker-label">Hour</label>
            <CustomSelect
              value={display12}
              options={hourOptions}
              onChange={(h12) => {
                const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                update('hour', h24);
              }}
            />
          </div>

          <div className="date-picker-field date-picker-field-sm">
            <label className="date-picker-label">Min</label>
            <CustomSelect
              value={dateParts.minute}
              options={minuteOptions}
              onChange={(m) => update('minute', m)}
            />
          </div>

          <div className="date-picker-field date-picker-field-sm">
            <label className="date-picker-label">&nbsp;</label>
            <div className="clock-ampm">
              <button className={!isPM ? 'active' : ''} onClick={() => toggleAMPM(false)}>AM</button>
              <button className={isPM ? 'active' : ''} onClick={() => toggleAMPM(true)}>PM</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="date-time-picker" ref={pickerRef}>
      <div className="picker-tabs">
        <button className={tab === 'date' ? 'active' : ''} onClick={() => setTab('date')}>Date</button>
        <button className={tab === 'time' ? 'active' : ''} onClick={() => setTab('time')}>Time</button>
      </div>
      <div className="picker-body">
        {tab === 'date' ? renderCalendar() : renderTimeDropdowns()}
      </div>
      <div className="picker-footer">
        <button onClick={onClose} className="picker-done">Done</button>
      </div>
    </div>
  );
}

export default function Editor({
  entry,
  onSave,
  onDelete,
  onBack,
  onStart,
  focusContentOnLoad = false,
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dateParts, setDateParts] = useState(null);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const debounceRef = useRef(null);
  const entryRef = useRef(null);
  const contentRef = useRef(null);

  // Grow the textarea to fit its content so the page scrolls, not the box
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [content, entry?.id]);

  // For entries started from a prompt, put the cursor at the end of the text
  useEffect(() => {
    if (!focusContentOnLoad || !entry) return;
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [entry?.id, focusContentOnLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      setContent(entry.content || '');
      setDateParts(parseDate(entry.createdAt));
      setIsEditingDate(false);
      setSaveStatus(null);
      setFadeOut(false);
      setShowDeleteConfirm(false);
      entryRef.current = entry.id;
    }
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save with debounce
  const triggerSave = useCallback(
    (newTitle, newContent, newDateParts) => {
      if (!entry) return;
      if (!newTitle.trim() && !newContent.trim()) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        if (entryRef.current !== entry.id) return;

        setSaveStatus('saving');
        try {
          const newCreatedAt = buildIso(newDateParts);
          await onSave(entry.id, newTitle, newContent, newCreatedAt);
          if (entryRef.current === entry.id) {
            setSaveStatus('saved');
            setFadeOut(false);
            setTimeout(() => {
              if (entryRef.current === entry.id) {
                setFadeOut(true);
                setTimeout(() => {
                  if (entryRef.current === entry.id) {
                    setSaveStatus(null);
                    setFadeOut(false);
                  }
                }, 300);
              }
            }, 2000);
          }
        } catch (err) {
          if (entryRef.current === entry.id) {
            setSaveStatus('error');
            setFadeOut(false);
          }
        }
      }, 1500);
    },
    [entry, onSave]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    triggerSave(newTitle, content, dateParts);
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    triggerSave(title, newContent, dateParts);
  };

  const handleDatePartsChange = (newParts) => {
    setDateParts(newParts);
    triggerSave(title, content, newParts);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    if (entry) onDelete(entry.id);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  if (!entry) {
    return (
      <div className="editor-container">
        <HomeScreen onStart={onStart} />
      </div>
    );
  }

  const displayIso = dateParts ? buildIso(dateParts) : entry.createdAt;

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button className="editor-back-btn" onClick={onBack}>
          ← Back
        </button>

        <div className="editor-header-actions">
          {saveStatus && (
            <span
              className={`save-status ${saveStatus} ${fadeOut ? 'fade-out' : ''}`}
            >
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Error saving'}
            </span>
          )}

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <span>Delete this entry?</span>
              <button
                className="delete-confirm-btn delete-confirm-yes"
                onClick={handleDeleteConfirm}
              >
                Confirm
              </button>
              <button
                className="delete-confirm-btn delete-confirm-cancel"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="delete-entry-btn"
              className="delete-btn"
              onClick={handleDeleteClick}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="editor-body">
        <input
          id="editor-title"
          className="editor-title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={handleTitleChange}
        />

        <div className="editor-timestamp">
          <button
            className="editor-date-display"
            onClick={() => setIsEditingDate(!isEditingDate)}
            title="Click to edit date & time"
          >
            {formatTimestamp(displayIso)}
            <span className="editor-date-edit-icon">✎</span>
          </button>

          {isEditingDate && dateParts && (
            <DateTimePicker
              dateParts={dateParts}
              onChange={handleDatePartsChange}
              onClose={() => setIsEditingDate(false)}
            />
          )}
        </div>

        <textarea
          ref={contentRef}
          id="editor-content"
          className="editor-content"
          placeholder="Write something..."
          value={content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
