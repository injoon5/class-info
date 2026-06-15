<script lang="ts">
import { inputBase } from './styles';

let {
	value = $bindable(''),
	type = 'text',
	id,
	name,
	placeholder = '',
	disabled = false,
	required = false,
	min,
	inputmode,
	class: klass = '',
	oninput,
	onchange
}: {
	value?: string;
	type?: 'text' | 'number' | 'password';
	id?: string;
	name?: string;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	min?: string | number;
	inputmode?: 'text' | 'numeric' | 'search';
	class?: string;
	oninput?: (e: Event) => void;
	onchange?: (e: Event) => void;
} = $props();

// `value` is updated manually (not `bind:value`) so a dynamic `type` is allowed.
function handleInput(e: Event) {
	value = (e.currentTarget as HTMLInputElement).value;
	oninput?.(e);
}
</script>

<input
	{id}
	{name}
	{type}
	{placeholder}
	{disabled}
	{required}
	{min}
	{inputmode}
	{value}
	oninput={handleInput}
	{onchange}
	autocomplete="off"
	autocapitalize="off"
	autocorrect="off"
	class="{inputBase} {klass}"
/>
