// Shared field styling so inputs, selects and the combobox stay identical.
// `text-base` (16px) on mobile prevents iOS Safari from zooming on focus; the
// taller `py-2.5` gives a comfortable touch target. Desktop tightens to sm.
export const inputBase =
	'w-full px-3 py-2.5 sm:py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 ' +
	'bg-white dark:bg-neutral-800 text-base sm:text-sm text-neutral-800 dark:text-neutral-200 ' +
	'outline-none transition-colors focus:border-neutral-500 dark:focus:border-neutral-400 ' +
	'disabled:opacity-50 disabled:cursor-not-allowed';
