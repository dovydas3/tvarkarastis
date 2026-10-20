import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { nowInVilnius } from './dates';

/** Dabartinis Vilniaus laikas, atnaujinamas kas 30 s ir grįžus į programėlę. */
export function useNow() {
  const [now, setNow] = useState(() => nowInVilnius());
  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const n = nowInVilnius();
        return n.date === prev.date && n.minutes === prev.minutes ? prev : n;
      });
    const id = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

/** Bendra gestų būsena: kol tempiamas blokas, braukimas nekeičia dienos, o puslapis neslenka. */
export const gesture = { dragging: false };

if (typeof window !== 'undefined') {
  // Nepasyvus klausytojas: tik taip galima sustabdyti puslapio slinkimą tempiant bloką.
  window.addEventListener(
    'touchmove',
    (e) => {
      if (gesture.dragging && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
}

let hapticsEnabled = true;
export const setHapticsEnabled = (on: boolean) => {
  hapticsEnabled = on;
};
export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/** Lengva vibracija (Android). iOS naršyklės Vibration API nepalaiko – tada nieko nevyksta. */
export function haptic(pattern: number | number[] = 10) {
  if (!hapticsEnabled || !hapticsSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* kai kurios naršyklės meta klaidą be naudotojo gesto */
  }
}

/** Horizontalus braukimas: kairėn → onNext, dešinėn → onPrev. */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      if (!start.current || gesture.dragging) {
        start.current = null;
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      haptic(8);
      if (dx < 0) onNext();
      else onPrev();
    },
  };
}

/**
 * Animacijos klasė turiniui, kai keičiasi data / savaitė / mėnuo:
 * pirmyn – įslenka iš dešinės, atgal – iš kairės. Naudoti kartu su key={value}.
 */
export function useSlideClass(value: string): string {
  const prev = useRef(value);
  const dir = useRef('');
  if (prev.current !== value) {
    dir.current = value > prev.current ? 'slide-from-right' : 'slide-from-left';
    prev.current = value;
  }
  return dir.current;
}
