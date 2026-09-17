/**
 * ChatBadge — the default Companion surface (CP.5): intercom-style badge
 * ("porthole"), persistent on every workspace, animated in the kintsugi/
 * natally house style; occasional idle gestures (signing with a cross ✠,
 * waving) on a jittered cadence, honoring prefers-reduced-motion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  badgeAnimationActive,
  GESTURE_DURATION_MS,
  nextGestureDelay,
  pickGesture,
  type BadgeGesture,
} from '../core/chat/gestures.ts';

interface Props {
  open: boolean;
  onToggle: () => void;
}

export default function ChatBadge({ open, onToggle }: Props) {
  const [gesture, setGesture] = useState<BadgeGesture | null>(null);
  const [reduced, setReduced] = useState(
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );
  const stepRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const schedule = useCallback(function loop() {
    timerRef.current = setTimeout(() => {
      const g = pickGesture(stepRef.current++);
      setGesture(g);
      setTimeout(() => setGesture(null), GESTURE_DURATION_MS);
      loop();
    }, nextGestureDelay());
  }, []);

  useEffect(() => {
    if (!badgeAnimationActive(reduced)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setGesture(null);
      return;
    }
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reduced, schedule]);

  return (
    <button
      type="button"
      className={`chat-badge${open ? ' open' : ''}${gesture ? ` gesture-${gesture}` : ''}${
        reduced ? ' static' : ''
      }`}
      onClick={onToggle}
      aria-label={open ? 'Close companion chat' : 'Open companion chat'}
      aria-pressed={open}
      title="Companion"
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="chat-badge-avatar">
        <defs>
          <radialGradient id="cb-halo" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="rgba(255, 244, 214, 0.95)" />
            <stop offset="100%" stopColor="rgba(255, 244, 214, 0)" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="31" fill="url(#cb-halo)" />
        {/* porthole ring */}
        <circle cx="32" cy="32" r="28.5" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.5" />
        {/* tonsured monk bust, single-line house style */}
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <circle cx="32" cy="23.5" r="7.4" />
          <path d="M24.6 27.4c-4.5 1.8-7.1 4.6-7.1 9.6v6.5h29v-6.5c0-5-2.6-7.8-7.1-9.6" />
          <path d="M32 31v5" />
          <path d="M26.8 44.6c1.6 2.2 3.4 3.3 5.2 3.3s3.6-1.1 5.2-3.3" />
        </g>
      </svg>
      {gesture === 'cross' && (
        <span className="chat-badge-glyph" aria-hidden="true">
          ✠
        </span>
      )}
    </button>
  );
}
