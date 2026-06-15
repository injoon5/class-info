<script lang="ts">
import { inputBase } from './ui/styles';

export type ComboboxItem = { value: string; label: string; sublabel?: string };

let {
	id,
	items = [],
	loading = false,
	placeholder = '',
	disabled = false,
	query = $bindable(''),
	emptyText = '검색 결과가 없습니다.',
	hintText = '',
	minChars = 2,
	onsearch,
	onselect
}: {
	id?: string;
	items?: ComboboxItem[];
	loading?: boolean;
	placeholder?: string;
	disabled?: boolean;
	query?: string;
	emptyText?: string;
	hintText?: string;
	minChars?: number;
	onsearch?: (q: string) => void;
	onselect?: (item: ComboboxItem) => void;
} = $props();

let open = $state(false);
let activeIndex = $state(-1);
let debounce: ReturnType<typeof setTimeout>;

function handleInput(e: Event) {
	query = (e.target as HTMLInputElement).value;
	open = true;
	activeIndex = -1;
	clearTimeout(debounce);
	const q = query.trim();
	debounce = setTimeout(() => onsearch?.(q), 250);
}

function choose(item: ComboboxItem) {
	clearTimeout(debounce); // cancel any pending search from the last keystroke
	query = item.label;
	open = false;
	activeIndex = -1;
	onselect?.(item);
}

function handleKeydown(e: KeyboardEvent) {
	if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
		open = true;
		return;
	}
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		activeIndex = Math.min(activeIndex + 1, items.length - 1);
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		activeIndex = Math.max(activeIndex - 1, 0);
	} else if (e.key === 'Enter') {
		if (open && activeIndex >= 0 && items[activeIndex]) {
			e.preventDefault();
			choose(items[activeIndex]);
		}
	} else if (e.key === 'Escape') {
		open = false;
	}
}

const showPanel = $derived(open && query.trim().length >= minChars);
const listId = $derived(`${id ?? 'combobox'}-listbox`);
</script>

<div class="relative">
	<input
		{id}
		type="text"
		role="combobox"
		aria-expanded={showPanel}
		aria-controls={listId}
		aria-autocomplete="list"
		autocomplete="off"
		autocapitalize="off"
		autocorrect="off"
		inputmode="search"
		enterkeyhint="search"
		{placeholder}
		{disabled}
		bind:value={query}
		oninput={handleInput}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => (open = false), 150)}
		onkeydown={handleKeydown}
		class={inputBase}
	/>

	{#if showPanel}
		<ul
			id={listId}
			role="listbox"
			class="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg py-1"
		>
			{#if loading}
				<li class="px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500">검색 중…</li>
			{:else if items.length === 0}
				<li class="px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500">{emptyText}</li>
			{:else}
				{#each items as item, i (item.value)}
					<li role="option" aria-selected={i === activeIndex}>
						<button
							type="button"
							onpointerdown={(e) => {
								e.preventDefault();
								choose(item);
							}}
							onmouseenter={() => (activeIndex = i)}
							class="w-full text-left px-3 py-2.5 flex items-baseline justify-between gap-2 {i === activeIndex
								? 'bg-neutral-100 dark:bg-neutral-700'
								: ''}"
						>
							<span class="text-sm text-neutral-800 dark:text-neutral-200 truncate">{item.label}</span>
							{#if item.sublabel}
								<span class="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">{item.sublabel}</span>
							{/if}
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>

{#if hintText}
	<p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{hintText}</p>
{/if}
