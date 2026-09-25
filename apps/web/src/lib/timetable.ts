// The fetched weeks are stored by offset (0 = this week, 1 = next), but an
// offset is only true as of the poll that wrote it: from Monday midnight
// until the first poll the "this week" row still holds last week, and a
// break with nothing to fetch leaves an old week there indefinitely. Rows
// stamped with their Monday are matched on that instead; only rows written
// before the stamp existed fall back to the offset.
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
