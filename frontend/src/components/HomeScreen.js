import React, { useState } from 'react';
import { pickPrompts } from '../data/prompts';
import './HomeScreen.css';

function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Shown when no entry is selected. Offers writing prompts and a quick-start box.
 * onStart(text) creates a new entry whose content is `text`.
 */
export default function HomeScreen({ onStart }) {
  const [prompts, setPrompts] = useState(() => pickPrompts(4));
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="home-screen">
      <div className="home-content">
        <h1 className="home-greeting">
          <img src="/myday-logo-light.png" alt="" className="home-logo" />
          {greeting}
        </h1>
        <div className="home-date">{formatToday()}</div>
        <p className="home-question">What's on your mind today?</p>

        <div className="home-prompts">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="home-prompt-chip"
              onClick={() => onStart(prompt + ' ')}
            >
              {prompt}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="home-shuffle"
          onClick={() => setPrompts(pickPrompts(4))}
        >
          ↻ Show other ideas
        </button>

        <div className="home-start-label">Or start a new entry</div>
        <textarea
          className="home-start-box"
          placeholder="Today I..."
          rows={3}
          onChange={(e) => {
            const text = e.target.value;
            if (text) onStart(text);
          }}
        />
      </div>
    </div>
  );
}
