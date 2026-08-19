// Grow a textarea to fit its content. The description field is styled
// `resize-none overflow-hidden`, which without this made anything past the
// eighth row unreachable — not scrollable, not resizable.
//
// Pass the bound value so `update` fires when the field is filled
// programmatically (opening the editor on an existing notice), not just on
// typing.
export function autosize(node: HTMLTextAreaElement, _value?: unknown) {
	const resize = () => {
		node.style.height = 'auto';
		node.style.height = `${node.scrollHeight}px`;
	};

	resize();
	node.addEventListener('input', resize);

	return {
		update: resize,
		destroy() {
			node.removeEventListener('input', resize);
		}
	};
}
