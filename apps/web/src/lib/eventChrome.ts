// One event = one chrome. Calendar chips, home dots, and the day-drawer
// used to each invent the same palette. Full Tailwind strings stay in these
// maps so the compiler can see every class.

export type EventChrome = {
	chip: string;
	dot: string;
	popupBar: string;
	popupBg: string;
	label: string;
	labelColor: string;
};

const HOLIDAY: EventChrome = {
	chip: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
	dot: 'bg-red-500 dark:bg-red-400',
	popupBar: 'bg-red-400',
	popupBg: 'bg-red-50 dark:bg-red-400/10',
	label: '공휴일',
	labelColor: 'text-red-600 dark:text-red-400',
};

const CLOSURE: Omit<EventChrome, 'label'> = {
	chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	dot: 'bg-amber-500 dark:bg-amber-400',
	popupBar: 'bg-amber-400',
	popupBg: 'bg-amber-50 dark:bg-amber-400/10',
	labelColor: 'text-amber-700 dark:text-amber-400',
};

const SCHOOL_DEFAULT: EventChrome = {
	chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
	dot: 'bg-sky-500 dark:bg-sky-400',
	popupBar: 'bg-sky-400',
	popupBg: 'bg-sky-50 dark:bg-sky-400/10',
	label: '학교 행사',
	labelColor: 'text-sky-700 dark:text-sky-400',
};

export const CUSTOM_EVENT_COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'] as const;
export type CustomEventColor = (typeof CUSTOM_EVENT_COLORS)[number];

export const CUSTOM_EVENT_CHROME: Record<CustomEventColor, EventChrome> = {
	blue: {
		chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		dot: 'bg-blue-500 dark:bg-blue-400',
		popupBar: 'bg-blue-400',
		popupBg: 'bg-blue-50 dark:bg-blue-400/10',
		label: '학급 일정',
		labelColor: 'text-blue-600 dark:text-blue-400',
	},
	green: {
		chip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
		dot: 'bg-green-500 dark:bg-green-400',
		popupBar: 'bg-green-400',
		popupBg: 'bg-green-50 dark:bg-green-400/10',
		label: '학급 일정',
		labelColor: 'text-green-700 dark:text-green-400',
	},
	purple: {
		chip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
		dot: 'bg-purple-500 dark:bg-purple-400',
		popupBar: 'bg-purple-400',
		popupBg: 'bg-purple-50 dark:bg-purple-400/10',
		label: '학급 일정',
		labelColor: 'text-purple-600 dark:text-purple-400',
	},
	orange: {
		chip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
		dot: 'bg-orange-500 dark:bg-orange-400',
		popupBar: 'bg-orange-400',
		popupBg: 'bg-orange-50 dark:bg-orange-400/10',
		label: '학급 일정',
		labelColor: 'text-orange-700 dark:text-orange-400',
	},
	pink: {
		chip: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
		dot: 'bg-pink-500 dark:bg-pink-400',
		popupBar: 'bg-pink-400',
		popupBg: 'bg-pink-50 dark:bg-pink-400/10',
		label: '학급 일정',
		labelColor: 'text-pink-600 dark:text-pink-400',
	},
	teal: {
		chip: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
		dot: 'bg-teal-500 dark:bg-teal-400',
		popupBar: 'bg-teal-400',
		popupBg: 'bg-teal-50 dark:bg-teal-400/10',
		label: '학급 일정',
		labelColor: 'text-teal-700 dark:text-teal-400',
	},
};

// Picker swatches. Orange/pink sit one step lighter so they don't read as
// "selected" before a check is drawn on them.
export const CUSTOM_COLOR_SWATCH: Record<CustomEventColor, string> = {
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	purple: 'bg-purple-500',
	orange: 'bg-orange-400',
	pink: 'bg-pink-400',
	teal: 'bg-teal-500',
};

function isCustomColor(color: string | null | undefined): color is CustomEventColor {
	return (CUSTOM_EVENT_COLORS as readonly string[]).includes(color ?? '');
}

function schoolChrome(eventType?: string | null): EventChrome {
	if (eventType === '공휴일') return HOLIDAY;
	if (eventType === '휴업일' || eventType === '재량휴업일') {
		return { ...CLOSURE, label: eventType };
	}
	return SCHOOL_DEFAULT;
}

export function eventChrome(event: {
	source?: string;
	color?: string | null;
	eventType?: string | null;
}): EventChrome {
	if (event.source === 'custom') {
		return CUSTOM_EVENT_CHROME[isCustomColor(event.color) ? event.color : 'blue'];
	}
	return schoolChrome(event.eventType);
}
