<script lang="ts">
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
const client = useConvexClient();

let code = $state('');
let subdomain = $state('');
let schoolCode = $state('');
let schoolName = $state('');
let grade = $state('');
let classNo = $state('');
let pin = $state('');

let submitting = $state(false);
let errorMsg = $state<string | null>(null);

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
		// Drop an existing subdomain label if present (more than 2 labels).
		apex = parts.length > 2 ? parts.slice(1).join('.') : hostname;
	}
	return `${protocol}//${sub}.${apex}${portSuffix}/${g}/${c}`;
}

async function handleSubmit(e: Event) {
	e.preventDefault();
	errorMsg = null;

	const g = Number(grade);
	const c = Number(classNo);
	if (!Number.isInteger(g) || !Number.isInteger(c) || g <= 0 || c <= 0) {
		errorMsg = '학년과 반을 올바르게 입력하세요.';
		return;
	}
	if (!/^[a-z0-9-]{2,40}$/.test(subdomain.trim().toLowerCase())) {
		errorMsg = '서브도메인은 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
		return;
	}
	if (!schoolCode.trim() || !schoolName.trim() || !pin.trim()) {
		errorMsg = '모든 필드를 입력하세요.';
		return;
	}

	submitting = true;
	try {
		const result = await client.action((api as any).classes.register, {
			code: code.trim(),
			subdomain: subdomain.trim().toLowerCase(),
			schoolCode: schoolCode.trim(),
			schoolName: schoolName.trim(),
			grade: g,
			classNo: c,
			pin: pin.trim(),
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
		<div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-6 text-center">
			<p class="text-neutral-700 dark:text-neutral-300">현재 신규 등록이 비활성화되어 있습니다.</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="grid gap-4">
			<div>
				<label for="code" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">등록 코드</label>
				<input id="code" type="text" bind:value={code} autocomplete="off"
					class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
			</div>

			<div>
				<label for="subdomain" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">서브도메인</label>
				<input id="subdomain" type="text" bind:value={subdomain} placeholder="예: hana-high" autocomplete="off"
					class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				<p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">학교 주소가 됩니다. 같은 학교의 다른 학급은 같은 서브도메인을 쓰세요.</p>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="schoolCode" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">학교 코드 (NEIS)</label>
					<input id="schoolCode" type="text" bind:value={schoolCode} placeholder="예: 7010208" autocomplete="off"
						class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				</div>
				<div>
					<label for="schoolName" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">학교 이름</label>
					<input id="schoolName" type="text" bind:value={schoolName} autocomplete="off"
						class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				</div>
			</div>

			<div class="grid grid-cols-3 gap-3">
				<div>
					<label for="grade" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">학년</label>
					<input id="grade" type="number" min="1" bind:value={grade}
						class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				</div>
				<div>
					<label for="classNo" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">반</label>
					<input id="classNo" type="number" min="1" bind:value={classNo}
						class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				</div>
				<div>
					<label for="pin" class="block text-sm font-medium mb-1 text-neutral-600 dark:text-neutral-300">관리자 PIN</label>
					<input id="pin" type="text" bind:value={pin}
						class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200" />
				</div>
			</div>

			{#if errorMsg}
				<div class="text-sm text-red-600 dark:text-red-400">{errorMsg}</div>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="pressable-lg w-full px-4 py-2.5 rounded-xl bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-50 transition-colors"
			>{submitting ? '등록 중…' : '등록하기'}</button>
		</form>
	{/if}
</div>
