<script lang="ts">
import type { Snippet } from 'svelte';
import { Tween } from 'svelte/motion';
import {
  PANEL_CLOSE_MS,
  projectMomentum,
  reducedMotion,
  SHEET_DISMISS,
  SHEET_PRESENT,
  SHEET_SETTLE,
  spring,
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

// Unmount one frame's grace after the close tween lands. Derived from the
// tween itself so retiming the dismiss can't leave the teardown behind — and
// collapsed under reduced motion, where the tween is instant and a fixed wait
// would just hold a finished sheet on screen.
const closeDelay = () => (reducedMotion() ? 0 : PANEL_CLOSE_MS + 30);

// ── Animation state ─────────────────────────────────────────────────────────

let mounted = $state(false);
let isVisible = $state(false);
let isClosing = false; // non-reactive guard

// Drag writes transform on the node (Vaul: don't restyle children 60fps).
// Open/close/snap-back are Tweens so they share expoOut with the rest of the app.
let dragY = 0;
let isDragging = $state(false);
let panelHeight = $state(800);

// The sheet's Y is the one value a finger drives, so it is a spring rather
// than a tween: it starts from wherever the sheet actually is and carries the
// speed the finger let go at. Desktop's scale/fade is not gesture-driven and
// stays a tween — a dialog that merely appeared has no momentum to express.
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
  opts: { velocity?: number; damping?: number; response?: number },
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

// Detect mobile for animation type (slide vs scale+fade)
let isMobile = $state(true);
$effect(() => {
  const mq = window.matchMedia('(min-width: 640px)');
  isMobile = !mq.matches;
  const handler = (e: MediaQueryListEvent) => { isMobile = !e.matches; };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
});

// Track panel height whenever it mounts
$effect(() => {
  if (panelEl) panelHeight = panelEl.offsetHeight;
});

// iOS Safari will not raise the keyboard for inputs inside a transformed
// ancestor. Drop the transform once the sheet is parked.
// A settling spring may overshoot through 0 on its way back. Parking the
// transform the moment it crosses would drop the sheet a few pixels, so this
// waits for the spring to actually stop.
const sheetSettled = $derived(
  !isDragging && isVisible && panelResting && Math.abs(panelY) < 0.5
);

// On a phone the dim belongs to the sheet's position, not to a timer of its
// own: however the sheet arrives or leaves — tapped, thrown, dragged halfway
// and released — the scrim is exactly as far along as the sheet is.
const scrimValue = $derived(
  isMobile && panelHeight > 0
    ? Math.max(0, Math.min(1, 1 - panelY / panelHeight))
    : scrimOpacity.current
);

// `backdrop-filter` re-samples the whole page behind the scrim on every frame
// its opacity changes, which is the most expensive thing either animation
// does on a phone. The tint alone carries the fade; the blur waits for the
// scrim to land and then eases in on its own.
const scrimSettled = $derived(
  !isDragging && isVisible && scrimValue > 0.99
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

// One write per frame, coalesced onto the animation frame.
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

// ── Open / close ─────────────────────────────────────────────────────────────

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
  // Re-measure: the panel grows after it opens (nutrient tables, the calendar
  // add form sliding out), and closing by a height captured at open time left
  // the bottom of the sheet still on screen when it unmounted.
  if (panelEl) panelHeight = panelEl.offsetHeight;
  if (isMobile) {
    // A spring has no fixed duration, so the teardown waits on the sheet
    // itself rather than on a clock that would have to guess. The timeout is
    // only there so an interrupted spring can never strand the component.
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      springPanelY(panelHeight, { ...SHEET_DISMISS, velocity }, finish);
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

// iOS Safari tints its own chrome — the status bar, and with the keyboard up
// the strip its URL and accessory bars float in — with `theme-color`. The page
// sets that to the page background, so under a sheet the band directly below
// the sheet stayed page-dark and read as a gap in it. While a sheet is up the
// nearest surface to that chrome is the sheet, so the chrome takes the sheet's
// colour and the two read as one surface.
//
// Resolved through a canvas rather than hardcoded: `--card` is an oklch token,
// and `theme-color` predates that syntax in Safari. Painting it and reading
// the pixel back gives sRGB whatever the token is written in, and cannot drift
// from the token the way a second copy of the value would.
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

  // Inserted ahead of the page's own, media-scoped tags: the browser takes the
  // first one whose media matches, so appending would never win.
  document.head.insertBefore(meta, document.head.querySelector('meta[name="theme-color"]'));

  // This tag carries one colour rather than a pair, so a sheet left open
  // across a light/dark flip would hold the old one. Re-read on the next
  // frame, once the class that drives the token has actually been swapped.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const repaint = () => requestAnimationFrame(paint);
  mq.addEventListener('change', repaint);

  return () => {
    mq.removeEventListener('change', repaint);
    meta.remove();
  };
});

// Block body scroll while visible; release as soon as close animation begins
$effect(() => {
  if (isVisible) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
});

// Desktop only — focusing the sheet on iOS eats the next input tap
// (field is focused, keyboard never comes up).
$effect(() => {
  if (isVisible && panelEl && !isMobile) panelEl.focus();
});

$effect(() => {
  const vv = window.visualViewport;
  if (!vv || !mounted) return;

  let wasCovered = false;
  const update = () => {
    if (!wrapperEl) return;
    // What the keyboard covers at the bottom of the layout viewport.
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    if (covered > 0) {
      // Height alone: it already ends where the keyboard begins, and padding
      // on top of it comes out of the same box and squeezes the panel.
      wrapperEl.style.height = `${vv.height + vv.offsetTop}px`;
      wrapperEl.style.paddingBottom = '';
      // svh does not account for the keyboard, so cap the panel to what is
      // actually left above it.
      if (panelEl) panelEl.style.maxHeight = `${Math.max(160, vv.height - 24)}px`;
    } else {
      wrapperEl.style.height = '';
      wrapperEl.style.paddingBottom = '';
      if (panelEl) panelEl.style.maxHeight = '';
      // iOS leaves a composited `position: fixed` layer stuck after the
      // keyboard hides until something invalidates it.
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

// ── Shared drag state ────────────────────────────────────────────────────────

let pointerStartY = 0;
// Where the sheet already was when the finger landed, so the drag moves it
// from there rather than from the top of the screen.
let dragOffset = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let pointerVelocity = 0;

// A pointer that hasn't moved in this long is standing still, whatever the
// last sample said.
const VELOCITY_STALE_MS = 60;

// After the content reaches its top, a fast flick still has momentum in it.
// Dragging within that window is almost always the tail of the scroll rather
// than an attempt to dismiss, so the sheet ignores it.
const SCROLL_SETTLE_MS = 100;
let reachedTopAt = 0;

function onContentScroll() {
  if (contentEl && contentEl.scrollTop <= 0) reachedTopAt = Date.now();
}

// Overdrag gives, then gives less — things in the world slow down before they
// stop. Only when the content cannot scroll: where it can, an upward gesture
// belongs to the scroller, not to the sheet.
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
  // Take over from wherever the sheet is right now. Grabbing one still on its
  // way in used to restart tracking from zero, which snapped it home under the
  // finger before the drag had moved at all.
  stopPanelSpring?.();
  stopPanelSpring = null;
  dragOffset = panelY;
  dragY = dragOffset;
  isDragging = true;
  // Hold the current pose on the node before Svelte drops the Tween style.
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

  // An upward gesture is handed to the scroller, so the content can scroll out
  // from under an in-flight drag. Rebase to where the finger is now: coming
  // back down should start the sheet from rest, not jump it by the whole
  // excursion the scroller already consumed.
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
  // Velocity only updates while the pointer moves. Flicking down and then
  // holding still before letting go left the flick's velocity standing, and
  // the sheet dismissed out from under a finger that had deliberately
  // stopped — so a pointer that has been at rest is at rest.
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

  // Decide on where the throw is heading, not on where the finger happened to
  // stop. A flick that has barely moved the sheet still dismisses it, and a
  // sheet dragged most of the way down but held there does not — which is the
  // difference between a threshold the user has to learn and one they already
  // know from every other sheet on the phone. Only downward momentum counts;
  // an upward flick leaves the decision to position alone.
  const projected = y + Math.max(0, projectMomentum(pxPerSecond));

  setPanelY(y);
  if (projected > panelHeight * 0.4) close(pxPerSecond);
  else settleOpen(pxPerSecond);
}

// ── Touch drag (non-passive so we can preventDefault) ───────────────────────

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

// Don't start a drag on the tap itself. iOS will not raise the keyboard
// for a field inside a transformed ancestor, and even a 2px "drag" from a
// tap re-applies translateY for the snap-back tween.
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
    // Downward drag and rubber-banded overdrag both belong to the sheet; a
    // plain upward gesture is left to the scroller.
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
  // Re-stamped on the way out too: a long drag would otherwise age past the
  // window before the replayed mousedown arrives.
  lastTouchAt = performance.now();
  pendingTouch = false;
  endDrag();
}

// ── Mouse drag ───────────────────────────────────────────────────────────────

// A press is not a drag until it travels. Starting the drag on mousedown meant
// `preventDefault` fired for every press that landed outside the scroller —
// and preventing a mousedown's default cancels the focus it was about to give.
// Browsers replay a tap as mousedown/mouseup/click once the touch ends, so on
// a phone that swallowed the focus for anything in the header or footer: the
// calendar's add-event field could be tapped, and nothing happened. Waiting
// for the pointer to travel means a plain press keeps its default, and a real
// drag still suppresses selection the moment it starts.
const MOUSE_SLOP = 6;
let pendingMouse = $state(false);
let pendingMouseY = 0;

// The replayed tap above is not a second gesture. Ignore mouse events that
// arrive on the heels of a touch, so only one path drives the sheet.
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

// Cursor and selection belong to a drag that is actually happening, not to a
// press that might still turn out to be a click.
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
  // Same fields the touch path leaves alone — dragging inside one is the user
  // selecting text, not reaching for the sheet.
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

// ── Keyboard: Escape to close, Tab to trap focus within the dialog ────────────

function onPanelKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
    return;
  }
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
  <!-- Backdrop -->
  <div
    bind:this={backdropEl}
    class="fixed inset-0 bg-black/40 dark:bg-black/60 z-50
           transition-[backdrop-filter] duration-150 ease-out
           {scrimSettled ? 'backdrop-blur-sm' : 'will-change-[opacity]'}"
    style={isDragging ? '' : `opacity: ${scrimValue}`}
    role="presentation"
    onclick={() => close()}
  ></div>

  <!-- Wrapper -->
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
             outline-none {sheetSettled ? '' : 'will-change-transform'}"
      style={panelStyle}
      onclick={(e) => e.stopPropagation()}
      onkeydown={onPanelKeydown}
    >
      <!-- Drag handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 rounded-full bg-border"></div>
      </div>

      <!-- Header: custom content + close button -->
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

      <!-- Scrollable body -->
      <div
        bind:this={contentEl}
        onscroll={onContentScroll}
        class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0"
      >
        {@render children()}
      </div>

      <!-- Optional footer -->
      {#if footer}
        <div class="flex-shrink-0 border-t border-border px-4 py-4">
          {@render footer()}
        </div>
      {/if}

    </div>
  </div>
{/if}
