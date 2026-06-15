<script lang="ts">
import { onMount } from 'svelte';
import { useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { Button, Input, Field, Card } from '../../components/ui';

const client = useConvexClient();
const STORAGE_KEY = 'superadmin_pw';

type Overview = {
	config: { enabled: boolean; code: string };
	totals: { schools: number; classes: number };
	schools: Array<{
		_id: string;
		subdomain: string;
		schoolName: string;
		schoolCode: string;
		createdAt: number;
		classes: Array<{ _id: string; grade: number; classNo: number }>;
	}>;
};

let password = $state('');
let authed = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);
let overview = $state<Overview | null>(null);

// Registration config (editable)
let regEnabled = $state(true);
let regCode = $state('');
let regMsg = $state<string | null>(null);

// Change password
let newPw = $state('');
let confirmPw = $state('');
let pwMsg = $state<string | null>(null);

async function fetchOverview(pw: string): Promise<Overview> {
	return (await client.query((api as any).superadmin.overview, { password: pw })) as Overview;
}

function applyOverview(o: Overview) {
	overview = o;
	regEnabled = o.config.enabled;
	regCode = o.config.code;
}

async function login() {
	error = null;
	loading = true;
	try {
		const o = await fetchOverview(password);
		applyOverview(o);
		authed = true;
		sessionStorage.setItem(STORAGE_KEY, password);
	} catch (err: any) {
		error = err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '인증에 실패했습니다.';
	} finally {
		loading = false;
	}
}

async function refresh() {
	try {
		applyOverview(await fetchOverview(password));
	} catch {}
}

async function saveRegistration() {
	regMsg = null;
	try {
		await client.mutation((api as any).superadmin.setRegistration, {
			password,
			enabled: regEnabled,
			code: regCode
		});
		regMsg = '저장되었습니다.';
		await refresh();
	} catch (err: any) {
		regMsg = err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '저장 실패';
	}
}

async function changePassword() {
	pwMsg = null;
	if (newPw.length < 4) {
		pwMsg = '새 비밀번호는 4자 이상이어야 합니다.';
		return;
	}
	if (newPw !== confirmPw) {
		pwMsg = '비밀번호가 일치하지 않습니다.';
		return;
	}
	try {
		await client.mutation((api as any).superadmin.setPassword, { password, newPassword: newPw });
		password = newPw;
		sessionStorage.setItem(STORAGE_KEY, newPw);
		newPw = '';
		confirmPw = '';
		pwMsg = '비밀번호가 변경되었습니다.';
	} catch (err: any) {
		pwMsg = err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '변경 실패';
	}
}

let deleting = $state<string | null>(null);

async function deleteSchool(schoolId: string, name: string) {
	if (!confirm(`'${name}' 학교와 모든 학급·공지·급식·일정을 영구 삭제합니다. 계속할까요?`)) return;
	deleting = schoolId;
	try {
		await client.mutation((api as any).superadmin.deleteSchool, { password, schoolId });
		await refresh();
	} catch (err: any) {
		alert(err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '삭제 실패');
	} finally {
		deleting = null;
	}
}

async function deleteClass(classId: string, label: string) {
	if (!confirm(`'${label}' 학급과 그 공지·시간표·첨부파일을 영구 삭제합니다. 계속할까요?`)) return;
	deleting = classId;
	try {
		await client.mutation((api as any).superadmin.deleteClass, { password, classId });
		await refresh();
	} catch (err: any) {
		alert(err?.message ? String(err.message).replace(/^.*Error:\s*/, '') : '삭제 실패');
	} finally {
		deleting = null;
	}
}

function logout() {
	sessionStorage.removeItem(STORAGE_KEY);
	authed = false;
	password = '';
	overview = null;
}

onMount(async () => {
	const saved = sessionStorage.getItem(STORAGE_KEY);
	if (saved) {
		password = saved;
		await login();
	}
});

function fmtDate(ms: number): string {
	return new Date(ms).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<svelte:head>
	<title>슈퍼관리자 - TimeforSchool</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8">
	{#if !authed}
		<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">슈퍼관리자</h1>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				login();
			}}
			class="grid gap-4 max-w-sm"
		>
			<Field label="비밀번호" for="su-pw" error={error ?? ''}>
				<Input id="su-pw" type="password" bind:value={password} />
			</Field>
			<Button type="submit" full disabled={loading}>{loading ? '확인 중…' : '로그인'}</Button>
		</form>
	{:else if overview}
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">슈퍼관리자</h1>
			<Button variant="secondary" onclick={logout}>로그아웃</Button>
		</div>

		<div class="grid grid-cols-2 gap-3 mb-6">
			<Card class="text-center">
				<p class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{overview.totals.schools}</p>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">학교</p>
			</Card>
			<Card class="text-center">
				<p class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{overview.totals.classes}</p>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">학급</p>
			</Card>
		</div>

		<!-- Registration gate -->
		<Card class="mb-6">
			<h2 class="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-200">등록 설정</h2>
			<label class="flex items-center gap-2 mb-3 text-sm text-neutral-700 dark:text-neutral-300">
				<input type="checkbox" bind:checked={regEnabled} class="w-4 h-4 accent-neutral-800 dark:accent-neutral-200" />
				자가 등록 허용
			</label>
			<Field label="등록 코드 (비워두면 코드 없이 등록 가능)" for="reg-code">
				<Input id="reg-code" bind:value={regCode} placeholder="등록 코드" />
			</Field>
			<div class="mt-3 flex items-center gap-3">
				<Button onclick={saveRegistration}>저장</Button>
				{#if regMsg}<span class="text-sm text-neutral-500 dark:text-neutral-400">{regMsg}</span>{/if}
			</div>
		</Card>

		<!-- Schools + classes -->
		<Card class="mb-6">
			<h2 class="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-200">학교 및 학급</h2>
			{#if overview.schools.length === 0}
				<p class="text-sm text-neutral-500 dark:text-neutral-400">등록된 학교가 없습니다.</p>
			{:else}
				<div class="divide-y divide-neutral-100 dark:divide-neutral-700">
					{#each overview.schools as s (s._id)}
						<div class="py-3 first:pt-0 last:pb-0">
							<div class="flex items-baseline justify-between gap-2">
								<span class="font-semibold text-neutral-800 dark:text-neutral-200">{s.schoolName}</span>
								<div class="flex items-center gap-2 shrink-0">
									<span class="text-xs text-neutral-400 dark:text-neutral-500">{s.subdomain} · {s.schoolCode}</span>
									<button
										onclick={() => deleteSchool(s._id, s.schoolName)}
										disabled={deleting === s._id}
										class="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
									>{deleting === s._id ? '삭제 중…' : '학교 삭제'}</button>
								</div>
							</div>
							<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
								{#each s.classes as c (c._id)}
									<span class="inline-flex items-center gap-1 text-xs pl-1.5 pr-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 tabular-nums">
										{c.grade}-{c.classNo}
										<button
											onclick={() => deleteClass(c._id, `${c.grade}-${c.classNo}`)}
											disabled={deleting === c._id}
											aria-label="{c.grade}-{c.classNo} 학급 삭제"
											class="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 leading-none"
										>×</button>
									</span>
								{/each}
								{#if s.classes.length === 0}
									<span class="text-xs text-neutral-400 dark:text-neutral-500">학급 없음</span>
								{/if}
								<span class="text-xs text-neutral-400 dark:text-neutral-500 ml-auto">{fmtDate(s.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>

		<!-- Change superadmin password -->
		<Card>
			<h2 class="text-lg font-semibold mb-3 text-neutral-800 dark:text-neutral-200">비밀번호 변경</h2>
			<div class="grid gap-3 max-w-sm">
				<Field label="새 비밀번호" for="new-pw">
					<Input id="new-pw" type="password" bind:value={newPw} />
				</Field>
				<Field label="새 비밀번호 확인" for="confirm-pw">
					<Input id="confirm-pw" type="password" bind:value={confirmPw} />
				</Field>
				{#if pwMsg}
					<p class="text-sm {pwMsg.includes('변경되었') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">{pwMsg}</p>
				{/if}
				<Button onclick={changePassword}>변경</Button>
			</div>
		</Card>
	{/if}
</div>
