import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { DragMode } from './entries';
import { gesture, haptic } from './hooks';

/** Kiek laikyti pirštą, kol elementas „pakeliamas“ (kad paprastas slinkimas jo nejudintų). */
const LONG_PRESS_MS = 350;

export interface DragState {
  id: string;
  mode: DragMode;
  /** Pasislinkimas minutėmis, pritrauktas prie `snap` */
  delta: number;
  /** Piršto pasislinkimas pikseliais (vizualiam sekimui) */
  dy: number;
}

/**
 * Tempimas ilgu paspaudimu (pirštu) arba iškart (pele).
 * `bind(id, mode)` grąžina pointer įvykių apdorojimą; vienas tempimas vienu metu.
 */
export function useLongPressDrag({
  pxPerMin,
  snap = 15,
  enabled = true,
  onDrop,
}: {
  pxPerMin: number;
  snap?: number;
  enabled?: boolean;
  onDrop: (id: string, mode: DragMode, delta: number) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<{
    id: string;
    mode: DragMode;
    x0: number;
    y0: number;
    pointerType: string;
    active: boolean;
    timer?: number;
    delta: number;
  } | null>(null);
  const suppressClick = useRef(false);

  useEffect(
    () => () => {
      clearTimeout(pending.current?.timer);
      gesture.dragging = false;
    },
    [],
  );

  const activate = () => {
    const p = pending.current;
    if (!p) return;
    p.active = true;
    gesture.dragging = true;
    haptic(15);
    setDrag({ id: p.id, mode: p.mode, delta: 0, dy: 0 });
  };

  const reset = () => {
    clearTimeout(pending.current?.timer);
    const wasActive = pending.current?.active;
    pending.current = null;
    // pointerup ateina prieš touchend – vėliavą nuimam vėliau, kad braukimas nepakeistų dienos.
    if (wasActive) setTimeout(() => (gesture.dragging = false), 50);
    setDrag(null);
  };

  const onPointerMove = (ev: PointerEvent<HTMLElement>) => {
    const p = pending.current;
    if (!p) return;
    const dx = ev.clientX - p.x0;
    const dy = ev.clientY - p.y0;
    if (!p.active) {
      if (p.pointerType === 'mouse') {
        if (Math.abs(dy) > 4) activate();
        else return;
      } else {
        // Pirštas pajudėjo prieš ilgą paspaudimą – tai slinkimas, ne tempimas.
        if (Math.hypot(dx, dy) > 8) {
          clearTimeout(p.timer);
          pending.current = null;
        }
        return;
      }
    }
    const delta = Math.round(dy / pxPerMin / snap) * snap;
    if (delta !== p.delta) haptic(5);
    p.delta = delta;
    setDrag({ id: p.id, mode: p.mode, delta, dy });
  };

  const onPointerUp = () => {
    const p = pending.current;
    if (!p) return;
    if (p.active) {
      suppressClick.current = true;
      if (p.delta !== 0) onDrop(p.id, p.mode, p.delta);
    }
    reset();
  };

  const bind = (id: string, mode: DragMode) => ({
    onPointerDown: (ev: PointerEvent<HTMLElement>) => {
      if (!enabled || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      ev.stopPropagation();
      clearTimeout(pending.current?.timer);
      pending.current = { id, mode, x0: ev.clientX, y0: ev.clientY, pointerType: ev.pointerType, active: false, delta: 0 };
      if (ev.pointerType === 'mouse') ev.currentTarget.setPointerCapture(ev.pointerId);
      else pending.current.timer = window.setTimeout(activate, LONG_PRESS_MS);
    },
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
    onContextMenu: (ev: { preventDefault: () => void }) => enabled && ev.preventDefault(),
  });

  /** Ar paspaudimą ignoruoti (jis ką tik baigė tempimą). */
  const consumeClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  return { drag, bind, consumeClick };
}
