<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  onclose: () => void;
  header: Snippet;
  children: Snippet;
  footer?: Snippet;
}

let { open, onclose, header, children, footer }: Props = $props();

const TRANSITION_MS = 340;

// ── Animation state ─────────────────────────────────────────────────────────

let mounted = $state(false);
let isVisible = $state(false);
let isClosing = false; // non-reactive guard

let dragY = $state(0);
let isDragging = $state(false);
let panelHeight = $state(800);

let panelEl = $state<HTMLElement | undefined>();
let contentEl = $state<HTMLElement | undefined>();

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

// Backdrop opacity: dims as panel is dragged down
const backdropOpacity = $derived(
  isVisible ? Math.max(0, 1 - Math.max(0, dragY) / panelHeight) : 0
);

// Panel style: slide on mobile, scale+fade on desktop (both support translateY drag)
const panelStyle = $derived(
  isMobile
    ? `transform: translateY(${isDragging ? dragY : isVisible ? 0 : panelHeight}px); transition: transform ${isDragging ? 0 : TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1);`
    : `transform: translateY(${isDragging ? dragY : 0}px) scale(${isVisible ? 1 : 0.95}); opacity: ${isVisible ? 1 : 0}; transition: transform ${isDragging ? 0 : TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${isDragging ? 0 : Math.round(TRANSITION_MS * 0.65)}ms;`
);

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

// ── Shared drag state ────────────────────────────────────────────────────────

let pointerStartY = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let pointerVelocity = 0;

function startDrag(y: number) {
  if (isClosing || !isVisible) return false;
  if (contentEl && contentEl.scrollTop > 0) return false;
  if (panelEl) panelHeight = panelEl.offsetHeight;
  pointerStartY = y;
  lastPointerY = y;
  lastPointerTime = Date.now();
  pointerVelocity = 0;
  isDragging = true;
  return true;
}

function moveDrag(y: number) {
  if (!isDragging) return;
  const now = Date.now();
  const dt = now - lastPointerTime;
  if (dt > 0) pointerVelocity = (y - lastPointerY) / dt;
  lastPointerY = y;
  lastPointerTime = now;
  dragY = Math.max(0, y - pointerStartY);
}

function endDrag() {
  if (!isDragging) return;
  const dismiss = dragY > panelHeight * 0.4 || pointerVelocity > 0.5;
  if (dismiss) {
    close();
  } else {
    isDragging = false;
    dragY = 0;
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
  startDrag(e.touches[0].clientY);
}

function onTouchMove(e: TouchEvent) {
  moveDrag(e.touches[0].clientY);
  if (dragY > 0) e.preventDefault();
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
</script>

{#if mounted}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 dark:bg-black/70 z-50 backdrop-blur-[2px]"
    style="opacity: {backdropOpacity}; transition: opacity {isDragging ? 0 : TRANSITION_MS}ms;"
    role="presentation"
    onclick={close}
  ></div>

  <!-- Wrapper -->
  <div class="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
    <div
      bind:this={panelEl}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="pointer-events-auto w-full sm:w-[26rem] sm:max-w-[90vw]
             bg-white dark:bg-neutral-900
             rounded-t-3xl sm:rounded-2xl
             shadow-2xl flex flex-col
             max-h-[88svh] sm:max-h-[80svh]
             sm:border sm:border-neutral-200 sm:dark:border-neutral-700
             outline-none will-change-transform"
      style={panelStyle}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') close(); e.stopPropagation(); }}
    >
      <!-- Drag handle (mobile only) -->
      <div class="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
      </div>

      <!-- Header: custom content + close button -->
      <div class="px-4 pt-3 pb-4 sm:pt-4 flex items-start justify-between gap-3 flex-shrink-0 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex-1 min-w-0">
          {@render header()}
        </div>
        <button
          onclick={close}
          class="pressable flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90 active:bg-neutral-200 dark:active:bg-neutral-700 transition-all duration-75 mt-0.5"
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
        class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0"
      >
        {@render children()}
      </div>

      <!-- Optional footer -->
      {#if footer}
        <div class="flex-shrink-0 border-t border-neutral-100 dark:border-neutral-800 px-4 py-4">
          {@render footer()}
        </div>
      {/if}

    </div>
  </div>
{/if}
