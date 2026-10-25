import { EventBus } from '../core/events';

export type InputEvents = {
  /** Primary action at screen coords (tap / left click). */
  tap: { x: number; y: number };
  /** Secondary action (long-press / right click): examine, context menu. */
  alt: { x: number; y: number };
  hover: { x: number; y: number };
  pan: { dx: number; dy: number };
  zoom: { factor: number };
  rotate: { rad: number };
  rotateStep: { dir: number };
  key: { code: string; shift: boolean; ctrl: boolean };
};

const TAP_MOVE = 10;
const LONG_PRESS_MS = 500;

/** Unifies mouse, touch and keyboard into high-level game input events. */
export class Input extends EventBus<InputEvents> {
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; button: number }>();
  private longTimer?: number;
  private moved = false;
  private gesture?: { dist: number; angle: number; mx: number; my: number };
  /** Keys currently held (for continuous camera pan). */
  readonly held = new Set<string>();

  constructor(private el: HTMLElement) {
    super();
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onCancel);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  private local(e: PointerEvent | WheelEvent) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    this.el.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, { ...p, sx: p.x, sy: p.y, t: performance.now(), button: e.button });
    if (this.pointers.size === 1) {
      this.moved = false;
      if (e.pointerType !== 'mouse' || e.button === 0) {
        clearTimeout(this.longTimer);
        this.longTimer = window.setTimeout(() => {
          if (!this.moved && this.pointers.size === 1) {
            this.emit('alt', { x: p.x, y: p.y });
            this.moved = true; // consume: no tap on release
            navigator.vibrate?.(15);
          }
        }, LONG_PRESS_MS);
      }
    } else if (this.pointers.size === 2) {
      clearTimeout(this.longTimer);
      this.moved = true;
      this.gesture = this.measure();
    }
  };

  private measure() {
    const [a, b] = [...this.pointers.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  private onMove = (e: PointerEvent) => {
    const p = this.local(e);
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) {
      if (e.pointerType === 'mouse') this.emit('hover', p);
      return;
    }
    const dx = p.x - ptr.x, dy = p.y - ptr.y;
    ptr.x = p.x; ptr.y = p.y;
    if (this.pointers.size === 1) {
      if (!this.moved && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > TAP_MOVE) {
        this.moved = true;
        clearTimeout(this.longTimer);
      }
      if (this.moved) {
        if (ptr.button === 1) this.emit('rotate', { rad: dx * 0.01 });
        else this.emit('pan', { dx, dy });
      }
      if (e.pointerType === 'mouse') this.emit('hover', p);
    } else if (this.pointers.size === 2 && this.gesture) {
      const g = this.measure();
      if (this.gesture.dist > 0 && g.dist > 0) this.emit('zoom', { factor: this.gesture.dist / g.dist });
      let da = g.angle - this.gesture.angle;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > 0.0005) this.emit('rotate', { rad: -da });
      this.emit('pan', { dx: g.mx - this.gesture.mx, dy: g.my - this.gesture.my });
      this.gesture = g;
    }
  };

  private onUp = (e: PointerEvent) => {
    const ptr = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    clearTimeout(this.longTimer);
    if (!ptr) return;
    if (this.pointers.size === 0 && !this.moved) {
      if (e.pointerType === 'mouse' && ptr.button === 2) this.emit('alt', { x: ptr.x, y: ptr.y });
      else if (ptr.button === 0 || e.pointerType !== 'mouse') this.emit('tap', { x: ptr.x, y: ptr.y });
    }
    if (this.pointers.size < 2) this.gesture = undefined;
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    clearTimeout(this.longTimer);
    this.gesture = undefined;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.emit('zoom', { factor: Math.exp(e.deltaY * 0.0012) });
  };

  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
    this.held.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyQ') this.emit('rotateStep', { dir: -1 });
    if (e.code === 'KeyE') this.emit('rotateStep', { dir: 1 });
    this.emit('key', { code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
    if (['F5', 'F9'].includes(e.code)) e.preventDefault();
  };
}
