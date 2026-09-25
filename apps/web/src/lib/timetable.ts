// Stored weeks are keyed by offset (0 = this week, 1 = next) as of the poll
// that wrote them, so a stale row can pass for this week. Rows stamped with
// their Monday are matched on it; older rows fall back to the offset.
export function timetableForWeek<T extends { weekStart?: string }>(
	rows: [T | null | undefined, T | null | undefined],
	monday: string,
	offset: number
): T | null {
	if (rows.some((row) => row?.weekStart)) {
		return rows.find((row) => row?.weekStart === monday) ?? null;
	}
	return offset === 0 || offset === 1 ? (rows[offset] ?? null) : null;
}
