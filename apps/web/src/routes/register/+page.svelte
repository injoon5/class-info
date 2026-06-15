<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import Combobox, { type ComboboxItem } from '../../components/Combobox.svelte';
import { Button, Input, Select, Field, Card } from '../../components/ui';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
const client = useConvexClient();

let code = $state('');
let subdomain = $state('');
let pin = $state('');

// School selection (via search combobox)
type SchoolHit = { schoolCode: string; schoolName: string; region: string; kind: string };

let schoolQuery = $state('');
let schoolHits = $state<ComboboxItem[]>([]);
let rawHits = $state<SchoolHit[]>([]);
let schoolLoading = $state(false);
let selectedSchool = $state<{ schoolCode: string; schoolName: string; kind: string } | null>(null);
// If the school already exists we reuse its subdomain instead of asking for one.
let existingSubdomain = $state<string | null>(null);

// Grade + class (dependent dropdowns)
let grade = $state('');
let classNo = $state('');
let classOptions = $state<string[]>([]);
let classLoading = $state(false);
let classError = $state(false);

// If this exact class is already registered, redirect there instead.
let existingClass = $state<{ subdomain: string; grade: number; classNo: number } | null>(null);

let submitting = $state(false);
let errorMsg = $state<string | null>(null);

// Grade options inferred from the school kind (NEIS SCHUL_KND_SC_NM).
const gradeOptions = $derived.by(() => {
	const kind = selectedSchool?.kind ?? '';
	if (kind.includes('초등')) return [1, 2, 3, 4, 5, 6];
	if (kind.includes('중') || kind.includes('고')) return [1, 2, 3];
	return [1, 2, 3, 4, 5, 6];
});

async function searchSchools(q: string) {
	if (q.length < 2) {
		schoolHits = [];
		return;
	}
	schoolLoading = true;
	try {
		const hits = (await client.action((api as any).schools.searchByName, { name: q })) as SchoolHit[];
		rawHits = hits;
		// Disambiguate same-named schools by appending their region.
		const nameCounts = new Map<string, number>();
		for (const h of hits) nameCounts.set(h.schoolName, (nameCounts.get(h.schoolName) ?? 0) + 1);
		schoolHits = hits.map((h) => {
			const isDup = (nameCounts.get(h.schoolName) ?? 0) > 1 && h.region;
			return {
				value: h.schoolCode,
				label: isDup ? `${h.schoolName} (${h.region})` : h.schoolName,
				sublabel: [h.region, h.kind].filter(Boolean).join(' · ')
			};
		});
	} catch {
		schoolHits = [];
		rawHits = [];
	} finally {
		schoolLoading = false;
	}
}

async function selectSchool(item: ComboboxItem) {
	// Resolve the original (undecorated) record so we store the clean school name.
	const raw = rawHits.find((h) => h.schoolCode === item.value);
	selectedSchool = {
		schoolCode: item.value,
		schoolName: raw?.schoolName ?? item.label,
		kind: raw?.kind ?? ''
	};
	// Reset dependent fields.
	grade = '';
	classNo = '';
	classOptions = [];
	classError = false;
	existingClass = null;
	subdomain = '';
	existingSubdomain = null;

	// Is this school already registered? If so, reuse its subdomain.
	try {
		const reg = (await client.query((api as any).schools.publicByCode, {
			schoolCode: item.value
		})) as { subdomain: string } | null;
		if (reg) {
			existingSubdomain = reg.subdomain;
			subdomain = reg.subdomain;
		}
	} catch {
		existingSubdomain = null;
	}
}

async function loadClasses() {
	classNo = '';
	classOptions = [];
	classError = false;
	existingClass = null;
	if (!selectedSchool || !grade) return;
	classLoading = true;
	try {
		const list = (await client.action((api as any).classes.listAvailable, {
			schoolCode: selectedSchool.schoolCode,
			grade: Number(grade)
		})) as string[];
		classOptions = list;
		classError = list.length === 0;
	} catch {
		classError = true;
	} finally {
		classLoading = false;
	}
}

// When school + grade + class are all chosen, check whether it already exists.
let checkToken = 0;
$effect(() => {
	const school = selectedSchool;
	const g = Number(grade);
	const c = Number(classNo);
	if (!school || !(g > 0) || !(c > 0)) {
		existingClass = null;
		return;
	}
	const token = ++checkToken;
	client
		.query((api as any).classes.findExisting, { schoolCode: school.schoolCode, grade: g, classNo: c })
		.then((res: { subdomain: string; grade: number; classNo: number } | null) => {
			if (token === checkToken) existingClass = res;
		})
		.catch(() => {
			if (token === checkToken) existingClass = null;
		});
});

// Build the destination origin for a given subdomain based on the current host.
function targetUrl(sub: string, g: number, c: number): string {
	const { protocol, hostname, port } = window.location;
	const portSuffix = port ? `:${port}` : '';
	let apex: string;
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		apex = 'localhost';
	} else if (hostname.endsWith('.localhost')) {
		apex = 'localhost';
	} else {
		const parts = hostname.split('.');
		apex = parts.length > 2 ? parts.slice(1).join('.') : hostname;
	}
	return `${protocol}//${sub}.${apex}${portSuffix}/${g}/${c}`;
}

function goToExisting() {
	if (existingClass) {
		window.location.href = targetUrl(existingClass.subdomain, existingClass.grade, existingClass.classNo);
	}
}

async function handleSubmit(e: Event) {
	e.preventDefault();
	errorMsg = null;

	if (!selectedSchool) {
		errorMsg = '학교를 검색해 선택하세요.';
		return;
	}
	const g = Number(grade);
	const c = Number(classNo);
	if (!Number.isInteger(g) || !Number.isInteger(c) || g <= 0 || c <= 0) {
		errorMsg = '학년과 반을 선택하세요.';
		return;
	}
	const sub = (existingSubdomain ?? subdomain).trim().toLowerCase();
	if (!/^[a-z0-9-]{2,40}$/.test(sub)) {
		errorMsg = '서브도메인은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
		return;
	}
	if (!pin.trim()) {
		errorMsg = '관리자 PIN을 입력하세요.';
		return;
	}

	submitting = true;
	try {
		const result = await client.action((api as any).classes.register, {
			code: code.trim(),
			subdomain: sub,
			schoolCode: selectedSchool.schoolCode,
			schoolName: selectedSchool.schoolName,
			grade: g,
			classNo: c,
			pin: pin.trim()
		});
		window.location.href = targetUrl(result.subdomain, result.grade, result.classNo);
	} catch (err: any) {
		errorMsg = err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '등록 중 오류가 발생했습니다.';
		submitting = false;
	}
}
</script>

<svelte:head>
	<title>학급 등록 - TimeforSchool</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="max-w-md mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">학급 등록</h1>
	<p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">학교와 학급 정보를 입력해 새 페이지를 만드세요.</p>

	{#if !data.registrationEnabled}
		<Card class="text-center">
			<p class="text-neutral-700 dark:text-neutral-300">현재 신규 등록이 비활성화되어 있습니다.</p>
		</Card>
	{:else}
		<form onsubmit={handleSubmit} class="grid gap-4">
			<Field label="등록 코드" for="code">
				<Input id="code" bind:value={code} />
			</Field>

			<!-- School search -->
			<Field label="학교" for="school">
				<Combobox
					id="school"
					bind:query={schoolQuery}
					items={schoolHits}
					loading={schoolLoading}
					placeholder="학교 이름으로 검색"
					onsearch={searchSchools}
					onselect={selectSchool}
				/>
				{#if selectedSchool}
					<p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
						선택됨: {selectedSchool.schoolName} ({selectedSchool.schoolCode})
					</p>
				{/if}
			</Field>

			<!-- Grade + class (depend on selected school) -->
			<div class="grid grid-cols-2 gap-3">
				<Field label="학년" for="grade">
					<Select id="grade" bind:value={grade} disabled={!selectedSchool} onchange={loadClasses}>
						<option value="" disabled>선택</option>
						{#each gradeOptions as g}
							<option value={String(g)}>{g}학년</option>
						{/each}
					</Select>
				</Field>
				<Field
					label="반"
					for="classNo"
					hint={classLoading ? '반 목록 불러오는 중…' : ''}
					error={classError ? '반 목록을 못 불러왔어요. 직접 입력하세요.' : ''}
				>
					{#if classOptions.length > 0}
						<Select id="classNo" bind:value={classNo}>
							<option value="" disabled>선택</option>
							{#each classOptions as c}
								<option value={c}>{c}반</option>
							{/each}
						</Select>
					{:else}
						<Input
							id="classNo"
							type="number"
							min="1"
							inputmode="numeric"
							bind:value={classNo}
							disabled={!grade || classLoading}
							placeholder="반"
						/>
					{/if}
				</Field>
			</div>

			<!-- Subdomain: only when this is a NEW school. -->
			{#if selectedSchool && existingSubdomain}
				<Card class="!p-3 bg-neutral-50 dark:bg-neutral-800/60">
					<p class="text-sm text-neutral-600 dark:text-neutral-300">
						이미 등록된 학교예요. 주소: <span class="font-semibold">{existingSubdomain}</span>
					</p>
				</Card>
			{:else if selectedSchool}
				<Field
					label="서브도메인"
					for="subdomain"
					hint="학교 주소가 됩니다. 같은 학교의 다른 학급은 같은 서브도메인을 쓰세요."
				>
					<Input id="subdomain" bind:value={subdomain} placeholder="예: hana-high" inputmode="text" />
				</Field>
			{/if}

			<Field label="관리자 PIN" for="pin">
				<Input id="pin" bind:value={pin} />
			</Field>

			{#if errorMsg}
				<div class="text-sm text-red-600 dark:text-red-400">{errorMsg}</div>
			{/if}

			{#if existingClass}
				<Card class="!p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
					<p class="text-sm text-amber-800 dark:text-amber-300 mb-3">
						이미 등록된 학급입니다. 해당 페이지로 이동하세요.
					</p>
					<Button variant="primary" full onclick={goToExisting}>
						{existingClass.grade}학년 {existingClass.classNo}반으로 이동
					</Button>
				</Card>
			{:else}
				<Button type="submit" full disabled={submitting}>
					{submitting ? '등록 중…' : '등록하기'}
				</Button>
			{/if}
		</form>
	{/if}
</div>
