<script lang="ts">
import type { Snippet } from 'svelte';
import { Tween } from 'svelte/motion';
import {
  PANEL_CLOSE_MS,
  PANEL_OPEN_MS,
  projectMomentum,
  reducedMotion,
  SHEET_DISMISS,
  SHEET_PRESENT,
  SHEET_SETTLE,
  spring,
  type SpringOptions,
  tweenFade,
  tweenPanel,
  tweenPanelClose
} from '$lib/transitions';

interface Props {
  open: boolean;
  onclose: () => void;
  header: Snippet;
  children: Snippet;
  footer?: Snippet;
}

const { open, onclose, header, children, footer }: Props = $props();

// Unmount a frame after the desktop close tween; immediately under reduced motion.
const closeDelay = () => (reducedMotion() ? 0 : PANEL_CLOSE_MS + 30);


let mounted = $state(false);
let isVisible = $state(false);
let isClosing = false; // non-reactive guard

// A drag writes transform straight to the node rather than through state.
let dragY = 0;
let isDragging = $state(false);
let panelHeight = $state(800);

// The sheet's Y is a spring (it carries release velocity and can be grabbed
// mid-flight). Desktop's scale/fade is a plain tween.
let panelY = $state(0);
let panelResting = $state(true);
let stopPanelSpring: (() => void) | null = null;

const panelScale = new Tween(0.95, tweenPanel);
const panelOpacity = new Tween(0, tweenFade);
const scrimOpacity = new Tween(0, tweenPanel);

function setPanelY(y: number) {
  stopPanelSpring?.();
  stopPanelSpring = null;
  panelY = y;
  panelResting = true;
}

function springPanelY(
  to: number,
  opts: Omit<SpringOptions, 'from' | 'to' | 'onFrame' | 'onRest'>,
  onRest?: () => void
) {
  stopPanelSpring?.();
  panelResting = false;
  stopPanelSpring = spring({
    from: panelY,
    to,
    ...opts,
    onFrame: (v) => (panelY = v),
    onRest: () => {
      stopPanelSpring = null;
      panelResting = true;
      onRest?.();
    }
  });
}

let panelEl = $state<HTMLElement | undefined>();
let contentEl = $state<HTMLElement | undefined>();
let backdropEl = $state<HTMLElement | undefined>();
let wrapperEl = $state<HTMLElement | undefined>();

let isMobile = $state(true);
$effect(() => {
  const mq = window.matchMedia('(min-width: 640px)');
  isMobile = !mq.matches;
  const handler = (e: MediaQueryListEvent) => { isMobile = !e.matches; };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
});

$effect(() => {
  if (panelEl) panelHeight = panelEl.offsetHeight;
});

// iOS won't raise the keyboard inside a transformed ancestor, so the
// transform is dropped once the spring has fully stopped.
const sheetSettled = $derived(
  !isDragging && isVisible && panelResting && Math.abs(panelY) < 0.5
);

// On a phone the scrim tracks the sheet's position, however it moves.
const scrimValue = $derived(
  isMobile && panelHeight > 0
    ? Math.max(0, Math.min(1, 1 - panelY / panelHeight))
    : scrimOpacity.current
);

// The backdrop blur is expensive to animate, so it eases in on its own CSS
// transition, started early enough to finish with the scrim's expoOut.
const SCRIM_BLUR_MS = 150; // matches the `duration-150` on the backdrop below
const SCRIM_BLUR_THRESHOLD = 1 - Math.pow(2, -10 * (1 - SCRIM_BLUR_MS / PANEL_OPEN_MS));
const scrimSettled = $derived(
  !isDragging && isVisible && scrimValue > SCRIM_BLUR_THRESHOLD
);

const panelStyle = $derived(
  isDragging
    ? ''
    : isMobile
      ? sheetSettled
        ? 'transform: none'
        : `transform: translateY(${panelY}px)`
      : `transform: translateY(0px) scale(${panelScale.current}); opacity: ${panelOpacity.current}`
);

let dragFrame = 0;
function paintDrag() {
  dragFrame = 0;
  if (!isDragging) return;
  if (panelEl) {
    panelEl.style.transform = isMobile
      ? `translateY(${dragY}px)`
      : `translateY(${dragY}px) scale(1)`;
  }
  if (backdropEl) {
    backdropEl.style.opacity = String(Math.max(0, 1 - Math.max(0, dragY) / panelHeight));
  }
}
function scheduleDragPaint() {
  if (!dragFrame) dragFrame = requestAnimationFrame(paintDrag);
}


/**
 * Bring the sheet home. `velocity` is the speed the finger let go at, in px/s,
 * and is what makes the release seamless: the sheet keeps moving at the speed
 * it was already moving rather than restarting from nothing. A throw settles
 * with a little overshoot because it carried momentum; a tap does not.
 */
function settleOpen(velocity = 0) {
  if (isMobile) {
    springPanelY(0, velocity ? { ...SHEET_SETTLE, velocity } : SHEET_PRESENT);
    panelScale.set(1, { duration: 0 });
    panelOpacity.set(1, { duration: 0 });
  } else {
    setPanelY(0);
    panelScale.set(1, tweenPanel);
    panelOpacity.set(1, tweenFade);
    scrimOpacity.set(1, tweenPanel);
  }
}

async function close(velocity = 0) {
  if (isClosing) return;
  isClosing = true;
  isDragging = false;
  isVisible = false;
  if (panelEl) panelEl.style.transform = '';
  if (backdropEl) backdropEl.style.opacity = '';
  (document.activeElement instanceof HTMLElement ? document.activeElement : null)?.blur();
    // Re-measure: the panel may have grown since it opened.
  if (panelEl) panelHeight = panelEl.offsetHeight;
  if (isMobile) {
        // Teardown waits on the spring; the timeout only guards an interrupted one.
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
                // Let the last frame paint before unmounting.
        requestAnimationFrame(() => resolve());
      };
      springPanelY(
        panelHeight,
                // Stop once off screen instead of oscillating where no one can see.
        { ...SHEET_DISMISS, velocity, until: (y) => y >= panelHeight },
        finish
      );
      setTimeout(finish, 700);
    });
  } else {
    panelScale.set(0.95, tweenPanelClose);
    panelOpacity.set(0, tweenFade);
    scrimOpacity.set(0, tweenPanelClose);
    await new Promise<void>(r => setTimeout(r, closeDelay()));
  }
  mounted = false;
  isClosing = false;
  onclose();
}

$effect(() => {
  if (open && !mounted && !isClosing) {
    mounted = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (panelEl) panelHeight = panelEl.offsetHeight;
      if (isMobile) {
        setPanelY(panelHeight);
        panelScale.set(1, { duration: 0 });
        panelOpacity.set(1, { duration: 0 });
      } else {
        setPanelY(0);
        panelScale.set(0.95, { duration: 0 });
        panelOpacity.set(0, { duration: 0 });
      }
      scrimOpacity.set(0, { duration: 0 });
      isVisible = true;
      settleOpen();
    }));
  } else if (!open && mounted && !isClosing) {
    close();
  }
});

// While a sheet is up, iOS Safari's chrome (status bar, keyboard accessory)
// takes the sheet's colour via theme-color. The oklch token is resolved to hex
// through a canvas, since Safari's theme-color doesn't accept oklch.
function resolveToHex(color: string): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

$effect(() => {
  if (!isVisible || !panelEl) return;
  const el = panelEl;

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  const paint = () => {
    const hex = resolveToHex(getComputedStyle(el).backgroundColor);
    if (hex) meta.content = hex;
  };
  paint();

    // Ahead of the page's media-scoped tags: the first match wins.
  document.head.insertBefore(meta, document.head.querySelector('meta[name="theme-color"]'));

    // Re-read after a light/dark flip.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const repaint = () => requestAnimationFrame(paint);
  mq.addEventListener('change', repaint);

  return () => {
    mq.removeEventListener('change', repaint);
    meta.remove();
  };
});

$effect(() => {
  if (isVisible) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
});

// Desktop only: focusing the sheet on iOS eats the next input tap.
// Focus goes back to whatever opened the sheet once it closes.
$effect(() => {
  if (!isVisible || !panelEl || isMobile) return;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  panelEl.focus();
  return () => {
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
});

// Escape closes from anywhere, not only while focus is inside the panel.
$effect(() => {
  if (!isVisible) return;
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    close();
  };
  window.addEventListener('keydown', onKeydown);
  return () => window.removeEventListener('keydown', onKeydown);
});

$effect(() => {
  const vv = window.visualViewport;
  if (!vv || !mounted) return;

  let wasCovered = false;
  const update = () => {
    if (!wrapperEl) return;
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    if (covered > 0) {
      wrapperEl.style.height = `${vv.height + vv.offsetTop}px`;
      wrapperEl.style.paddingBottom = '';
            // svh ignores the keyboard, so cap the panel to what's left above it.
      if (panelEl) panelEl.style.maxHeight = `${Math.max(160, vv.height - 24)}px`;
    } else {
      wrapperEl.style.height = '';
      wrapperEl.style.paddingBottom = '';
      if (panelEl) panelEl.style.maxHeight = '';
            // iOS can leave a fixed layer stuck after the keyboard hides.
      if (wasCovered && panelEl && !isDragging) {
        const el = panelEl;
        el.style.transform = 'translate3d(0,0,0)';
        requestAnimationFrame(() => {
          if (el && !isDragging) el.style.transform = '';
        });
      }
    }
    wasCovered = covered > 0;
  };

  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    if (wrapperEl) {
      wrapperEl.style.height = '';
      wrapperEl.style.paddingBottom = '';
    }
    if (panelEl) panelEl.style.maxHeight = '';
  };
});


let pointerStartY = 0;
let dragOffset = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let pointerVelocity = 0;

const VELOCITY_STALE_MS = 60;

// A drag right after a scroll reaches the top is the scroll's tail, not a dismiss.
const SCROLL_SETTLE_MS = 100;
let reachedTopAt = 0;

function onContentScroll() {
  if (contentEl && contentEl.scrollTop <= 0) reachedTopAt = Date.now();
}

// Rubber-banded overdrag upward, only when the content can't scroll.
const OVERDRAG_LIMIT = 120;
const OVERDRAG_C = 0.55;
function rubberBand(delta: number): number {
  const x = -delta;
  return -(x * OVERDRAG_LIMIT * OVERDRAG_C) / (OVERDRAG_LIMIT + OVERDRAG_C * x);
}

function contentCanScroll() {
  return !!contentEl && contentEl.scrollHeight > contentEl.clientHeight + 1;
}

function startDrag(y: number) {
  if (isClosing || !isVisible) return false;
  if (isDragging) return false;
  if (contentEl && contentEl.scrollTop > 0) return false;
  if (Date.now() - reachedTopAt < SCROLL_SETTLE_MS) return false;
  if (panelEl) panelHeight = panelEl.offsetHeight;
  pointerStartY = y;
  lastPointerY = y;
  lastPointerTime = performance.now();
  pointerVelocity = 0;
    // Take over from wherever the sheet is right now.
  stopPanelSpring?.();
  stopPanelSpring = null;
  dragOffset = panelY;
  dragY = dragOffset;
  isDragging = true;
  if (panelEl) {
    panelEl.style.transform = isMobile
      ? `translateY(${panelY}px)`
      : `translateY(0px) scale(1)`;
  }
  if (backdropEl) backdropEl.style.opacity = String(scrimValue);
  return true;
}

function moveDrag(y: number) {
  if (!isDragging) return;
  const now = performance.now();
  const dt = now - lastPointerTime;
  if (dt > 0) pointerVelocity = (y - lastPointerY) / dt;
  lastPointerY = y;
  lastPointerTime = now;

    // Upward gestures belong to the scroller; rebase so coming back down
    // starts the sheet from rest.
  if (contentEl && contentEl.scrollTop > 0) {
    pointerStartY = y;
    if (dragY !== 0) {
      dragY = 0;
      scheduleDragPaint();
    }
    return;
  }

  const raw = dragOffset + (y - pointerStartY);
  dragY = raw >= 0 ? raw : contentCanScroll() ? 0 : rubberBand(raw);
  scheduleDragPaint();
}

function endDrag() {
  if (!isDragging) return;
  if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
    // A pointer that has been still before release has no velocity.
  const velocity =
    performance.now() - lastPointerTime > VELOCITY_STALE_MS ? 0 : pointerVelocity;
  const pxPerSecond = velocity * 1000;
  const y = dragY;
  dragY = 0;
  dragOffset = 0;
  pointerVelocity = 0;
  if (panelEl) panelEl.style.transform = '';
  if (backdropEl) backdropEl.style.opacity = '';
  isDragging = false;

    // Decide on where the throw is heading, not where the finger stopped.
    // Only downward momentum counts.
  const projected = y + Math.max(0, projectMomentum(pxPerSecond));

  setPanelY(y);
  if (projected > panelHeight * 0.4) close(pxPerSecond);
  else settleOpen(pxPerSecond);
}


$effect(() => {
  const panel = panelEl;
  if (!panel) return;
  panel.addEventListener('touchstart', onTouchStart, { passive: true });
  panel.addEventListener('touchmove', onTouchMove, { passive: false });
  panel.addEventListener('touchend', onTouchEnd);
  panel.addEventListener('touchcancel', onTouchEnd);
  return () => {
    panel.removeEventListener('touchstart', onTouchStart);
    panel.removeEventListener('touchmove', onTouchMove);
    panel.removeEventListener('touchend', onTouchEnd);
    panel.removeEventListener('touchcancel', onTouchEnd);
  };
});

// A tap is not a drag: even a 2px drag re-applies the transform, and iOS
// won't raise the keyboard under one.
const DRAG_SLOP = 10;
let pendingTouch = false;
let pendingStartY = 0;

function isDragIgnored(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(
    'input, textarea, select, [contenteditable="true"]'
  );
}

function onTouchStart(e: TouchEvent) {
  lastTouchAt = performance.now();
  if (e.touches.length > 1) return;
  if (isClosing || !isVisible) return;
  if (isDragIgnored(e.target)) return;
  const t = e.touches[0];
  if (!t) return;
  pendingTouch = true;
  pendingStartY = t.clientY;
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 1) return;
  const t = e.touches[0];
  if (!t) return;
  if (isDragging) {
    moveDrag(t.clientY);
    if (dragY !== 0) e.preventDefault();
    return;
  }
  if (!pendingTouch) return;
  if (Math.abs(t.clientY - pendingStartY) < DRAG_SLOP) return;
  pendingTouch = false;
  if (!startDrag(pendingStartY)) return;
  moveDrag(t.clientY);
  if (dragY !== 0) e.preventDefault();
}

function onTouchEnd() {
  lastTouchAt = performance.now();
  pendingTouch = false;
  endDrag();
}


// A press becomes a drag only once it travels, so a plain press keeps its
// default (preventing mousedown's default cancels focus).
const MOUSE_SLOP = 6;
let pendingMouse = $state(false);
let pendingMouseY = 0;

// Ignore the mouse events browsers replay after a touch.
const SYNTHETIC_MOUSE_MS = 700;
let lastTouchAt = 0;

$effect(() => {
  const panel = panelEl;
  if (!panel) return;
  panel.addEventListener('mousedown', onMouseDown);
  return () => panel.removeEventListener('mousedown', onMouseDown);
});

$effect(() => {
  if (!pendingMouse && !isDragging) return;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  return () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
});

$effect(() => {
  if (!isDragging) return;
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
  return () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
});

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  if (performance.now() - lastTouchAt < SYNTHETIC_MOUSE_MS) return;
  if (contentEl && contentEl.contains(e.target as Node)) return;
  if (isDragIgnored(e.target)) return;
  pendingMouse = true;
  pendingMouseY = e.clientY;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging) {
    if (!pendingMouse) return;
    if (Math.abs(e.clientY - pendingMouseY) < MOUSE_SLOP) return;
    pendingMouse = false;
    if (!startDrag(pendingMouseY)) return;
  }
  moveDrag(e.clientY);
}

function onMouseUp() {
  pendingMouse = false;
  endDrag();
}

// Tab stays inside the dialog.

function onPanelKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !panelEl) return;
  const focusables = panelEl.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === panelEl)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
</script>

{#if mounted}
  <div
    bind:this={backdropEl}
    class="fixed inset-0 bg-black/40 dark:bg-black/60 z-50
           transition-[backdrop-filter] duration-150 ease-out
           {scrimSettled ? 'backdrop-blur-sm' : 'will-change-[opacity]'}"
    style={isDragging ? '' : `opacity: ${scrimValue}`}
    role="presentation"
    onclick={() => close()}
  ></div>

  <div
    bind:this={wrapperEl}
    class="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
  >
    <div
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="pointer-events-auto w-full sm:w-[26rem] sm:max-w-[90vw]
             bg-card text-card-foreground
             rounded-t-3xl sm:rounded-3xl
             shadow-2xl flex flex-col
             max-h-[88svh] sm:max-h-[80svh]
             border-x border-t border-border sm:border
             outline-none relative {sheetSettled ? '' : 'will-change-transform'}"
      style={panelStyle}
      onclick={(e) => e.stopPropagation()}
      onkeydown={onPanelKeydown}
    >
      <!-- Hangs below the sheet so the entrance overshoot uncovers more sheet. -->
      <div
        class="sm:hidden absolute inset-x-0 top-full h-14 bg-card border-x border-border"
        aria-hidden="true"
      ></div>

      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 rounded-full bg-border"></div>
      </div>

      <div class="px-4 pt-3 pb-4 sm:pt-4 flex items-start justify-between gap-3 flex-shrink-0 border-b border-border">
        <div class="flex-1 min-w-0">
          {@render header()}
        </div>
        <button
          onclick={() => close()}
          class="pressable-icon touch-target flex-shrink-0 flex items-center justify-center w-8 h-8 -mr-1.5 rounded-full text-muted-foreground pointer:hover:text-foreground pointer:hover:bg-muted transition-colors duration-150 mt-0.5"
          aria-label="닫기"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <div
        bind:this={contentEl}
        onscroll={onContentScroll}
        class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0"
      >
        {@render children()}
      </div>

      {#if footer}
        <div class="flex-shrink-0 border-t border-border px-4 py-4">
          {@render footer()}
        </div>
      {/if}

    </div>
  </div>
{/if}
