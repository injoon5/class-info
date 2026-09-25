// Grows a textarea to fit its content. Pass the bound value so a programmatic
// fill (opening the editor on an existing notice) resizes too.
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
