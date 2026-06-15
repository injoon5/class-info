<script lang="ts">
import type { Snippet } from 'svelte';
import { inputBase } from './styles';

let {
	value = $bindable(''),
	id,
	disabled = false,
	class: klass = '',
	onchange,
	children
}: {
	value?: string;
	id?: string;
	disabled?: boolean;
	class?: string;
	onchange?: (e: Event) => void;
	children: Snippet;
} = $props();
</script>

<select {id} {disabled} bind:value {onchange} class="{inputBase} {klass} appearance-none bg-no-repeat pr-9"
	style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%239ca3af%22%3E%3Cpath fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22/%3E%3C/svg%3E'); background-position: right 0.6rem center; background-size: 1.1em;"
>
	{@render children()}
</select>
