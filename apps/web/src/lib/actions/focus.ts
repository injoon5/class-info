// Focus an element the moment it is revealed. An action rather than an
// $effect, so the intent lives on the element and $effect stays reserved for
// syncing external state.
export function focusOnElement(node: HTMLElement) {
	node.focus();
}
