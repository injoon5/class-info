<script lang="ts">
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '@class-info/backend/convex/_generated/api';
	import type { Id } from '@class-info/backend/convex/_generated/dataModel';

	let newTodoText = $state('');
	let isAdding = $state(false);
	let addError = $state<Error | null>(null);
	let togglingId = $state<Id<'todos'> | null>(null);
	let toggleError = $state<Error | null>(null);
	let deletingId = $state<Id<'todos'> | null>(null);
	let deleteError = $state<Error | null>(null);

	const client = useConvexClient();

	const todosQuery = useQuery(api.todos.getAll, {});

	async function handleAddTodo(event: SubmitEvent) {
		event.preventDefault();
		const text = newTodoText.trim();
		if (!text || isAdding) return;

		isAdding = true;
		addError = null;
		try {
			await client.mutation(api.todos.create, { text });
			newTodoText = '';
		} catch (err) {
			console.error('Failed to add todo:', err);
			addError = err instanceof Error ? err : new Error(String(err));
		} finally {
			isAdding = false;
		}
	}

	async function handleToggleTodo(id: Id<'todos'>, completed: boolean) {
		if (togglingId === id || deletingId === id) return;

		togglingId = id;
		toggleError = null;
		try {
			await client.mutation(api.todos.toggle, { id, completed: !completed });
		} catch (err) {
			console.error('Failed to toggle todo:', err);
			toggleError = err instanceof Error ? err : new Error(String(err));
		} finally {
			if (togglingId === id) {
				togglingId = null;
			}
		}
	}

	async function handleDeleteTodo(id: Id<'todos'>) {
		if (togglingId === id || deletingId === id) return;

		deletingId = id;
		deleteError = null;
		try {
			await client.mutation(api.todos.deleteTodo, { id });
		} catch (err) {
			console.error('Failed to delete todo:', err);
			deleteError = err instanceof Error ? err : new Error(String(err));
		} finally {
			if (deletingId === id) {
				deletingId = null;
			}
		}
	}

	const canAdd = $derived(!isAdding && newTodoText.trim().length > 0);
	const isLoadingTodos = $derived(todosQuery.isLoading);
	const todos = $derived(todosQuery.data ?? []);
	const hasTodos = $derived(todos.length > 0);

</script>

<div class="p-4">
	<h1 class="text-xl mb-4">Todos (Convex)</h1>

	<form onsubmit={handleAddTodo} class="flex gap-2 mb-4">
		<input
			type="text"
			bind:value={newTodoText}
			placeholder="New task..."
			disabled={isAdding}
			class="p-1 flex-grow"
		/>
		<button
			type="submit"
			disabled={!canAdd}
			class="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
		>
			{#if isAdding}Adding...{:else}Add{/if}
		</button>
	</form>

	{#if isLoadingTodos}
		<p>Loading...</p>
	{:else if !hasTodos}
		<p>No todos yet.</p>
	{:else}
		<ul class="space-y-1">
			{#each todos as todo (todo._id)}
				{@const isTogglingThis = togglingId === todo._id}
				{@const isDeletingThis = deletingId === todo._id}
				{@const isDisabled = isTogglingThis || isDeletingThis}
				<li
					class="flex items-center justify-between p-2"
					class:opacity-50={isDisabled}
				>
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id={`todo-${todo._id}`}
							checked={todo.completed}
							onchange={() => handleToggleTodo(todo._id, todo.completed)}
							disabled={isDisabled}
						/>
						<label
							for={`todo-${todo._id}`}
							class:line-through={todo.completed}
						>
							{todo.text}
						</label>
					</div>
					<button
						type="button"
						onclick={() => handleDeleteTodo(todo._id)}
						disabled={isDisabled}
						aria-label="Delete todo"
						class="text-red-500 px-1 disabled:opacity-50"
					>
						{#if isDeletingThis}Deleting...{:else}X{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if todosQuery.error}
		<p class="mt-4 text-red-500">
			Error loading: {todosQuery.error?.message ?? 'Unknown error'}
		</p>
	{/if}
	{#if addError}
		<p class="mt-4 text-red-500">
			Error adding: {addError.message ?? 'Unknown error'}
		</p>
	{/if}
	{#if toggleError}
		<p class="mt-4 text-red-500">
			Error updating: {toggleError.message ?? 'Unknown error'}
		</p>
	{/if}
	{#if deleteError}
		<p class="mt-4 text-red-500">
			Error deleting: {deleteError.message ?? 'Unknown error'}
		</p>
	{/if}
</div>
