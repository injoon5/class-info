<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  onclose: () => void;
  header: Snippet;
  children: Snippet;
  footer?: Snippet;
}

const { open, onclose, header, children, footer }: Props = $props();

const TRANSITION_MS = 340;

// ── Animation state ─────────────────────────────────────────────────────────

let mounted = $state(false);
let isVisible = $state(false);
let isClosing = false; // non-reactive guard

// Not reactive: written to the DOM directly while dragging. Vaul's lesson was
// about CSS variables forcing a recalc on every child; the same instinct
// applies to re-deriving a style string 60 times a second.
let dragY = 0;
let isDragging = $state(false);
let panelHeight = $state(800);

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

// Resting styles only — the drag positions are written imperatively below, and
// Svelte takes the panel back over the moment the drag ends.
const backdropOpacity = $derived(isVisible ? 1 : 0);

const panelStyle = $derived(
  isMobile
    ? `transform: translateY(${isVisible ? 0 : panelHeight}px); transition: transform ${isDragging ? 0 : TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1);`
    : `transform: translateY(0px) scale(${isVisible ? 1 : 0.95}); opacity: ${isVisible ? 1 : 0}; transition: transform ${isDragging ? 0 : TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${isDragging ? 0 : Math.round(TRANSITION_MS * 0.65)}ms;`
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

async function close() {
  if (isClosing) return;
  isClosing = true;
  isDragging = false;
  isVisible = false;
  await new Promise<void>(r => setTimeout(r, TRANSITION_MS + 30));
  mounted = false;
  isClosing = false;
  onclose();
}

$effect(() => {
  if (open && !mounted && !isClosing) {
    mounted = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (panelEl) panelHeight = panelEl.offsetHeight;
      isVisible = true;
    }));
  } else if (!open && mounted && !isClosing) {
    close();
  }
});

// Block body scroll while visible; release as soon as close animation begins
$effect(() => {
  if (isVisible) {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }
});

// Focus panel on open
$effect(() => {
  if (isVisible && panelEl) panelEl.focus();
});

$effect(() => {
  const vv = window.visualViewport;
  if (!vv || !mounted) return;

  const update = () => {
    if (!wrapperEl) return;
    // What the keyboard covers at the bottom of the layout viewport.
    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    if (covered > 0) {
      wrapperEl.style.height = `${vv.height + vv.offsetTop}px`;
      wrapperEl.style.paddingBottom = `${covered}px`;
      // svh does not account for the keyboard, so cap the panel to what is
      // actually left above it.
      if (panelEl) panelEl.style.maxHeight = `${Math.max(160, vv.height - 24)}px`;
    } else {
      wrapperEl.style.height = '';
      wrapperEl.style.paddingBottom = '';
      if (panelEl) panelEl.style.maxHeight = '';
    }
  };

  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    if (wrapperEl) {
      wrapperEl.style.height = '';
      wrapperEl.style.paddingBottom = '';
    }
    if (panelEl) panelEl.style.maxHeight = '';
  };
});

// ── Shared drag state ────────────────────────────────────────────────────────

let pointerStartY = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let pointerVelocity = 0;

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
  dragY = 0;
  isDragging = true;
  return true;
}

function moveDrag(y: number) {
  if (!isDragging) return;
  const now = performance.now();
  const dt = now - lastPointerTime;
  if (dt > 0) pointerVelocity = (y - lastPointerY) / dt;
  lastPointerY = y;
  lastPointerTime = now;

  const raw = y - pointerStartY;
  dragY = raw >= 0 ? raw : contentCanScroll() ? 0 : rubberBand(raw);
  scheduleDragPaint();
}

function endDrag() {
  if (!isDragging) return;
  if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
  const dismiss = dragY > panelHeight * 0.4 || pointerVelocity > 0.5;
  isDragging = false;
  dragY = 0;
  if (dismiss) {
    close();
  } else if (backdropEl) {
    // Hand the elements back to Svelte's resting styles.
    backdropEl.style.opacity = '';
  }
  pointerVelocity = 0;
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

function onTouchStart(e: TouchEvent) {
  if (e.touches.length > 1) return;
  startDrag(e.touches[0].clientY);
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 1) return;
  moveDrag(e.touches[0].clientY);
  // Downward drag and rubber-banded overdrag both belong to the sheet; a plain
  // upward gesture is left to the scroller.
  if (dragY !== 0) e.preventDefault();
}

function onTouchEnd() {
  endDrag();
}

// ── Mouse drag ───────────────────────────────────────────────────────────────

$effect(() => {
  const panel = panelEl;
  if (!panel) return;
  panel.addEventListener('mousedown', onMouseDown);
  return () => panel.removeEventListener('mousedown', onMouseDown);
});

$effect(() => {
  if (!isDragging) return;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
  return () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
});

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  if (contentEl && contentEl.contains(e.target as Node)) return;
  if (startDrag(e.clientY)) e.preventDefault();
}

function onMouseMove(e: MouseEvent) {
  moveDrag(e.clientY);
}

function onMouseUp() {
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
    class="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm"
    style="opacity: {backdropOpacity}; transition: opacity {isDragging ? 0 : TRANSITION_MS}ms;"
    role="presentation"
    onclick={close}
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
             border border-border
             outline-none will-change-transform"
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
          onclick={close}
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
