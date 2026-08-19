<script lang="ts">
	import HScroll from './HScroll.svelte';
	import { addDaysYyyymmdd, getNowInKst, yyyymmdd } from '$lib/date';

	type Variant = 'spinner' | 'timetable' | 'meals';

	let {
		compact = false,
		variant = 'spinner',
		weekStart
	}: {
		compact?: boolean;
		variant?: Variant;
		weekStart?: string;
	} = $props();

	const dayNames = ['월', '화', '수', '목', '금'];
	const periods = [1, 2, 3, 4, 5, 6, 7];
	const dishLineWidths = ['w-[88%]', 'w-[70%]', 'w-[82%]', 'w-[64%]', 'w-[76%]', 'w-[58%]'];

	function mealWeekDates(start: string, offsetDays: number): string[] {
		return [0, 1, 2, 3, 4].map((d) => addDaysYyyymmdd(start, offsetDays + d));
	}

	function mealDateLabel(dateStr: string): string {
		const y = Number(dateStr.slice(0, 4));
		const m = Number(dateStr.slice(4, 6));
		const d = Number(dateStr.slice(6, 8));
		const weekday = new Date(y, m - 1, d).toLocaleDateString('ko-KR', { weekday: 'short' });
		return `${m}/${d} (${weekday})`;
	}

	const todayStr = yyyymmdd(getNowInKst());
	const mealWeeks = $derived.by(() => {
		if (!weekStart) {
			return [
				{ dates: ['', '', '', '', ''] as string[] },
				{ dates: ['', '', '', '', ''] as string[] }
			];
		}
		return [
			{ dates: mealWeekDates(weekStart, 0) },
			{ dates: mealWeekDates(weekStart, 7) }
		];
	});
</script>

{#if variant === 'timetable'}
	<div class="print:hidden" role="status" aria-live="polite" aria-busy="true">
		<span class="sr-only">시간표를 불러오는 중</span>
		<div aria-hidden="true">
			<HScroll>
			<table
				class="w-full min-w-[18rem] table-fixed border border-border border-collapse overflow-hidden rounded-xl mx-auto"
			>
				<thead>
					<tr class="bg-muted">
						<th scope="col" class="px-1 py-3 border border-border"
							><span class="sr-only">교시</span></th
						>
						{#each dayNames as name (name)}
							<th
								scope="col"
								class="px-1 py-2 text-center text-base font-semibold sm:text-lg text-foreground border border-border"
								>{name}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each periods as period (period)}
						<tr>
							<th
								scope="row"
								class="px-0.5 py-3 sm:py-6 border border-border text-center font-normal bg-muted"
							>
								<div class="text-sm sm:text-lg font-semibold text-foreground whitespace-nowrap">
									{period}교시
								</div>
								<div class="skeleton h-2.5 w-8 mx-auto mt-1.5 rounded-sm"></div>
							</th>
							{#each dayNames as name, di (name)}
								<td class="border border-border py-3 sm:py-6 text-center bg-card">
									<div
										class="skeleton h-5 sm:h-6 w-12 sm:w-16 mx-auto rounded-md"
										style="animation-delay: {di * 40}ms"
									></div>
									<div
										class="skeleton h-3 sm:h-3.5 w-8 sm:w-10 mx-auto mt-1.5 rounded-sm"
										style="animation-delay: {di * 40 + 80}ms"
									></div>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			</HScroll>
		</div>
	</div>
{:else if variant === 'meals'}
	<div class="print:hidden" role="status" aria-live="polite" aria-busy="true">
		<span class="sr-only">급식을 불러오는 중</span>
		<div aria-hidden="true">
			<HScroll>
			{#each mealWeeks as week, wi (wi)}
				<div
					class={[
						'mb-4 grid grid-cols-5 min-w-[37rem] divide-x divide-border border border-border rounded-xl overflow-hidden',
						wi === 1 && 'mt-3'
					]}
				>
					{#each week.dates as date, di (`${wi}-${date || di}`)}
						<div
							class={[
								'p-2.5 sm:px-3 sm:py-3 flex flex-col justify-between min-h-[15rem]',
								date === todayStr ? 'bg-muted/60' : 'bg-card'
							]}
						>
							<div>
								{#if date}
									<h2
										class={[
											'text-sm sm:text-base font-semibold tabular-nums',
											date === todayStr ? 'text-foreground' : 'text-muted-foreground'
										]}
									>
										{mealDateLabel(date)}
									</h2>
								{:else}
									<div class="skeleton h-4 w-20 rounded-sm"></div>
								{/if}
								<ul class="mt-2.5 space-y-2">
									{#each dishLineWidths as width, li (width)}
										<li
											class="skeleton h-3.5 {width} rounded-sm"
											style="animation-delay: {(di + li) * 30}ms"
										></li>
									{/each}
								</ul>
							</div>
							<div
								class="skeleton mt-2 h-3 w-14 rounded-sm"
								style="animation-delay: {di * 30 + 120}ms"
							></div>
						</div>
					{/each}
				</div>
			{/each}
			</HScroll>
			<div
				class="block sm:hidden mt-1.5 text-center text-xs text-muted-foreground select-none pointer-events-none"
			>
				좌우로 스크롤하세요 →
			</div>
		</div>
	</div>
{:else}
	<div
		class="flex items-center gap-2.5 text-sm text-muted-foreground {compact
			? 'justify-center py-6'
			: 'justify-center py-16'}"
		role="status"
		aria-live="polite"
	>
		<span
			class="w-4 h-4 rounded-full border-2 border-border border-t-foreground animate-spin"
			aria-hidden="true"
		></span>
		<span>불러오는 중…</span>
	</div>
{/if}
