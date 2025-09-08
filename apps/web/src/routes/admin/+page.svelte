<script lang="ts">
import { useQuery, useConvexClient } from 'convex-svelte';
import { api } from "@class-info/backend/convex/_generated/api";
import { goto } from '$app/navigation';
import { writable } from 'svelte/store';

const notices = useQuery(api.notices.list, {});
const client = useConvexClient();

const showForm = writable(false);
const editingNotice = writable(null);

const form = writable({
	title: '',
	subject: '',
	type: '숙제' as '수행평가' | '숙제' | '준비물' | '기타',
	description: '',
	dueDate: ''
});

const noticeTypes = ['수행평가', '숙제', '준비물', '기타'] as const;

function resetForm() {
	form.set({
		title: '',
		subject: '',
		type: '숙제',
		description: '',
		dueDate: ''
	});
	editingNotice.set(null);
	showForm.set(false);
}

function editNotice(notice: any) {
	form.set({
		title: notice.title,
		subject: notice.subject,
		type: notice.type,
		description: notice.description,
		dueDate: notice.dueDate
	});
	editingNotice.set(notice);
	showForm.set(true);
}

async function handleSubmit() {
	const formData = $form;
	
	if (!formData.title || !formData.subject || !formData.dueDate) {
		alert('필수 항목을 모두 입력해주세요.');
		return;
	}
	
	try {
		if ($editingNotice) {
			await client.mutation(api.notices.update, {
				id: $editingNotice._id,
				...formData
			});
		} else {
			await client.mutation(api.notices.create, formData);
		}
		resetForm();
	} catch (error) {
		alert('저장 중 오류가 발생했습니다.');
	}
}

async function handleDelete(notice: any) {
	if (confirm('정말 삭제하시겠습니까?')) {
		try {
			await client.mutation(api.notices.remove, { id: notice._id });
		} catch (error) {
			alert('삭제 중 오류가 발생했습니다.');
		}
	}
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getTypeColor(type: string) {
	switch(type) {
		case '수행평가': return 'bg-[#3d3d3d] text-white';
		case '숙제': return 'bg-[#5c5c5c] text-white';
		case '준비물': return 'bg-[#888888] text-white';
		case '기타': return 'bg-[#b0b0b0] text-[#262626]';
		default: return 'bg-[#d1d1d1] text-[#262626]';
	}
}
</script>

<div class="min-h-screen bg-[#f6f6f6]">
	<div class="max-w-4xl mx-auto p-4">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8 pb-4 border-b border-[#d1d1d1]">
			<h1 class="text-2xl font-bold text-[#262626]">관리자 페이지</h1>
			<div class="flex gap-2">
				<button 
					on:click={() => showForm.set(!$showForm)}
					class="px-4 py-2 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]"
				>
					{$showForm ? '취소' : '새 알림 추가'}
				</button>
				<a href="/" class="px-4 py-2 border border-[#b0b0b0] text-sm hover:bg-[#e7e7e7] text-[#262626]">
					알림판으로
				</a>
			</div>
		</div>

		<!-- Form -->
		{#if $showForm}
			<div class="bg-white border border-[#d1d1d1] p-6 mb-8">
				<h2 class="text-lg font-semibold mb-4 text-[#262626]">
					{$editingNotice ? '알림 수정' : '새 알림 추가'}
				</h2>
				
				<div class="grid gap-4">
					<div>
						<label class="block text-sm font-medium mb-1 text-[#4f4f4f]">제목 *</label>
						<input 
							type="text" 
							bind:value={$form.title}
							class="w-full px-3 py-2 border border-[#b0b0b0] text-sm bg-white text-[#262626]"
							placeholder="예: 수학 과제 제출"
						/>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium mb-1 text-[#4f4f4f]">과목 *</label>
							<input 
								type="text" 
								bind:value={$form.subject}
								class="w-full px-3 py-2 border border-[#b0b0b0] text-sm bg-white text-[#262626]"
								placeholder="예: 수학"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium mb-1 text-[#4f4f4f]">종류 *</label>
							<select bind:value={$form.type} class="w-full px-3 py-2 border border-[#b0b0b0] text-sm bg-white text-[#262626]">
								{#each noticeTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>
					
					<div>
						<label class="block text-sm font-medium mb-1 text-[#4f4f4f]">마감일 *</label>
						<input 
							type="date" 
							bind:value={$form.dueDate}
							class="w-full px-3 py-2 border border-[#b0b0b0] text-sm bg-white text-[#262626]"
						/>
					</div>
					
					<div>
						<label class="block text-sm font-medium mb-1 text-[#4f4f4f]">설명</label>
						<textarea 
							bind:value={$form.description}
							rows="3"
							class="w-full px-3 py-2 border border-[#b0b0b0] text-sm bg-white text-[#262626]"
							placeholder="상세 설명 또는 준비물 목록"
						></textarea>
					</div>
					
					<div class="flex gap-2">
						<button 
							on:click={handleSubmit}
							class="px-4 py-2 bg-[#262626] text-white text-sm hover:bg-[#3d3d3d]"
						>
							{$editingNotice ? '수정' : '추가'}
						</button>
						<button 
							on:click={resetForm}
							class="px-4 py-2 border border-[#b0b0b0] text-sm hover:bg-[#e7e7e7] text-[#262626]"
						>
							취소
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Notice List -->
		{#if notices.isLoading}
			<div class="text-center py-8 text-[#6d6d6d]">로딩 중...</div>
		{:else if (notices.data || []).length === 0}
			<div class="text-center py-8 text-[#6d6d6d]">등록된 알림이 없습니다.</div>
		{:else}
			<div class="grid gap-3">
				{#each (notices.data || []) as notice}
					<div class="bg-white border border-[#d1d1d1] p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<span class="px-2 py-1 text-xs font-medium rounded {getTypeColor(notice.type)}">
										{notice.type}
									</span>
									<span class="text-sm font-medium text-[#5c5c5c]">
										{notice.subject}
									</span>
									<span class="text-xs text-[#6d6d6d]">
										마감: {formatDate(notice.dueDate)}
									</span>
								</div>
								<h3 class="font-semibold text-[#262626] mb-1">
									{notice.title}
								</h3>
								<p class="text-[#4f4f4f] text-sm">
									{notice.description}
								</p>
							</div>
							<div class="flex gap-2">
								<button 
									on:click={() => editNotice(notice)}
									class="px-3 py-1 text-xs border border-[#b0b0b0] hover:bg-[#e7e7e7] text-[#262626]"
								>
									수정
								</button>
								<button 
									on:click={() => handleDelete(notice)}
									class="px-3 py-1 text-xs bg-[#3d3d3d] text-white hover:bg-[#262626]"
								>
									삭제
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>