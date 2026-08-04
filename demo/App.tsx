import React, { useState } from 'react';
import { RangeControl } from './components/RangeControl';
import { useTheme } from './hooks/useTheme';

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export function App() {
  const [theme, toggleTheme] = useTheme();

  const [duration, setDuration] = useState(300);
  const [delay, setDelay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [scale, setScale] = useState(1);
  const [frequency, setFrequency] = useState(7.2);

  return (
    <main className="flex flex-col items-center min-h-dvh w-full py-14 px-4 gap-4 bg-[radial-gradient(ellipse_130%_60%_at_50%_0%,var(--page-bg-2),var(--page-bg))] bg-(--page-bg) transition-[background-color] duration-400">
      {/* Theme toggle */}
      <button
        type="button"
        className="fixed top-5 right-5 w-[52px] h-[30px] border-none rounded-full bg-(--card-bg) shadow-[0_0_0_1px_var(--card-ring),0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer z-100 transition-[box-shadow] duration-200 hover:shadow-[0_0_0_1px_var(--accent-border),0_4px_16px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-border),0_0_0_5px_var(--accent-glow)]"
        aria-label="Toggle theme"
        aria-pressed={theme === 'dark'}
        title="Toggle Theme"
        onClick={toggleTheme}
      >
        <span
          className="absolute top-1 left-1 w-[22px] h-[22px] rounded-full bg-(--accent) text-white grid place-items-center shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-360"
          style={{
            transform: theme === 'dark' ? 'translateX(22px)' : 'translateX(0)',
          }}
        >
          {theme === 'dark' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2 12h2.2M19.8 12H22M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
              </g>
            </svg>
          )}
        </span>
      </button>

      {/* Slider card */}
      <section
        className="rc-card"
        aria-labelledby="animation-title"
      >
        <header className="rc-card-head">
          <div>
            <h2 className="rc-card-title" id="animation-title">
              Animation
            </h2>
            <span className="rc-card-hint">
              Drag — Shift = Fine — Double Click = Edit
            </span>
          </div>
        </header>

        {/* Motion */}
        <section aria-label="Motion Controls">
          <div className="rc-row">
            <RangeControl
              label="Duration"
              min={0}
              max={5000}
              step={10}
              defaultValue={300}
              value={duration}
              unit="ms"
              decimals={0}
              ticks={21}
              onChange={setDuration}
            />
            <button
              className="rc-step"
              type="button"
              aria-label="Increase Duration by 50 milliseconds"
              title="Increase Duration"
              onClick={() => setDuration((d) => Math.min(5000, d + 50))}
            >
              <PlusIcon />
            </button>
          </div>

          <RangeControl
            label="Delay"
            min={0}
            max={2000}
            step={10}
            defaultValue={0}
            value={delay}
            unit="ms"
            decimals={0}
            ticks={21}
            onChange={setDelay}
          />
        </section>

        <div className="rc-divider" role="separator" aria-hidden="true" />

        {/* Dynamics */}
        <section aria-label="Dynamics Controls">
          <RangeControl
            label="Speed"
            min={0}
            max={3}
            step={0.001}
            defaultValue={1}
            value={speed}
            unit="x"
            decimals={3}
            ticks={11}
            onChange={setSpeed}
          />

          <RangeControl
            label="Scale"
            min={0.25}
            max={2.5}
            step={0.001}
            defaultValue={1}
            value={scale}
            unit="x"
            decimals={3}
            ticks={11}
            onChange={setScale}
          />

          <RangeControl
            label="Frequency"
            min={0.5}
            max={10}
            step={0.001}
            defaultValue={3.5}
            value={frequency}
            unit="Hz"
            decimals={3}
            ticks={11}
            onChange={setFrequency}
          />
        </section>
      </section>
    </main>
  );
}
