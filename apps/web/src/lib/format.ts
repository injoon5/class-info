export function formatFileSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// NEIS packs "name : value" pairs into one string separated by <br/>
// (nutrients, origin info). Pairs with no value are dropped.
export function parseInfoRows(text: string | null | undefined): [string, string][] {
	if (!text) return [];
	return text
		.split(/<br\s*\/?>/i)
		.map((line) => {
			const idx = line.indexOf(' : ');
			return idx === -1
				? ([line.trim(), ''] as [string, string])
				: ([line.slice(0, idx).trim(), line.slice(idx + 3).trim()] as [string, string]);
		})
		.filter(([name, value]) => name && value);
}
