export function blurActiveElement(): void {
	if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

// Enter that commits a Korean IME composition must not also submit the form.
export function holdComposingEnter(e: KeyboardEvent): void {
	if (e.key === 'Enter' && e.isComposing) e.preventDefault();
}
