import { CLASS, origin } from '@class-info/backend/convex/class';

export { CLASS };

export function pageTitle(page: string): string {
	return `${page} - ${CLASS.site.label}`;
}

export function siteUrl(path = ''): string {
	const base = origin(CLASS.site.url);
	if (!path) return base;
	return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function noticeTitle(subject: string, title: string): string {
	return `${subject} ${title} | ${CLASS.site.shortLabel} 학급 공지`;
}
