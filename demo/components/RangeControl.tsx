import React, { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const THUMB_W = 22;

const ResetIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface RangeControlProps {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  value: number;
  unit?: string;
  decimals?: number;
  ticks?: number;
  onChange: (value: number) => void;
}

export function RangeControl({
  label,
  min,
  max,
  step,
  defaultValue,
  value,
  unit = '',
  decimals = 0,
  ticks = 11,
  onChange,
}: RangeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const [isDrag, setIsDrag] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [elW, setElW] = useState(0);
  const [thumbX, setThumbX] = useState(THUMB_W / 2);
  const [fillPct, setFillPct] = useState(0);
  const [editText, setEditText] = useState('');

  const isModified = Math.abs(value - defaultValue) > 1e-9;

  const fmt = useCallback(
    (v: number) => v.toFixed(decimals),
    [decimals],
  );

  const refreshRect = useCallback(() => {
    if (trackRef.current) {
      setElW(trackRef.current.clientWidth || 340);
    }
  }, []);

  const paint = useCallback(() => {
    const p = (value - min) / (max - min);
    const w = elW || 340;
    const tx = THUMB_W / 2 + p * (w - THUMB_W);
    setThumbX(tx);
    setFillPct(p * 100);
  }, [value, min, max, elW]);

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    refreshRect();
  }, [refreshRect]);

  // ResizeObserver to repaint on container resize
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      refreshRect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [refreshRect]);

  const snapAndClamp = useCallback(
    (v: number): number => {
      const snapped = Math.round(v / step) * step;
      return clamp(Number(snapped.toFixed(8)), min, max);
    },
    [step, min, max],
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    onChange(v);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    setIsDrag(true);
    refreshRect();
  };

  const endDrag = useCallback(() => {
    setIsDrag(false);
  }, []);

  useEffect(() => {
    if (!isDrag) return;
    const up = () => endDrag();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [isDrag, endDrag]);

  // Wheel adjustment when focused
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (document.activeElement !== inputRef.current) return;
    e.preventDefault();
    const range = max - min;
    const unitStep = range / (e.shiftKey ? 400 : 80);
    const next = snapAndClamp(value - Math.sign(e.deltaY) * unitStep);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isEdit) return;
    const range = max - min;
    switch (e.key) {
      case 'PageUp':
        onChange(snapAndClamp(value + range / 10));
        e.preventDefault();
        break;
      case 'PageDown':
        onChange(snapAndClamp(value - range / 10));
        e.preventDefault();
        break;
      case 'Home':
        onChange(min);
        e.preventDefault();
        break;
      case 'End':
        onChange(max);
        e.preventDefault();
        break;
      case 'Enter':
        openEdit();
        e.preventDefault();
        break;
    }
  };

  const openEdit = () => {
    setEditText(fmt(value));
    setIsEdit(true);
    requestAnimationFrame(() => {
      editRef.current?.focus();
      editRef.current?.select();
    });
  };

  const commitEdit = (cancel: boolean) => {
    if (!cancel) {
      const v = parseFloat(editText.replace(',', '.'));
      if (Number.isFinite(v)) {
        onChange(snapAndClamp(v));
      }
    }
    setIsEdit(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') commitEdit(false);
    if (e.key === 'Escape') commitEdit(true);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.rc-reset')) return;
    openEdit();
  };

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onChange(defaultValue);
  };

  const tickArray = Array.from({ length: ticks }, (_, i) => i);

  const trackClass = [
    'rc',
    isDrag ? 'is-drag' : '',
    isEdit ? 'is-edit' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const fieldClass = [
    'rc-field',
    isModified ? 'is-mod' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fieldClass}>
      <div className="rc-head">
        <span className="rc-toplabel">{label}</span>
        <span className="rc-mark" />
        <button
          className="rc-reset"
          type="button"
          tabIndex={-1}
          aria-label={`Reset ${label}`}
          onClick={handleReset}
        >
          <ResetIcon />
        </button>
      </div>
      <div
        ref={trackRef}
        className={trackClass}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div className="rc-fill" style={{ width: `${fillPct}%` }} />
        <div className="rc-ticks">
          {tickArray.map((i) => (
            <i key={i} />
          ))}
        </div>
        <div className="rc-glow" style={{ left: `${thumbX}px` }} />
        <div className="rc-thumb" style={{ left: `${thumbX}px` }} />
        <span className="rc-val">
          <span className="rc-num">{fmt(value)}</span>
          {unit && <em>{unit}</em>}
        </span>
        <input
          ref={inputRef}
          className="rc-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInput}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${fmt(value)}${unit}`}
        />
        <div className="rc-focus-ring" />
        <input
          ref={editRef}
          className="rc-edit"
          inputMode="decimal"
          spellCheck={false}
          aria-label={`${label} edit`}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={() => commitEdit(false)}
        />
      </div>
    </div>
  );
}
