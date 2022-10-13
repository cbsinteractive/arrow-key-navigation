// This query is adapted from a11y-dialog
// https://github.com/edenspiekermann/a11y-dialog/blob/cf4ed81/a11y-dialog.js#L6-L18
export const defaultFocusableSelectors: string = 'a[href], area[href], input, select, textarea, ' +
	'button, iframe, object, embed, [contenteditable], [tabindex], ' +
	'[role=menuitem], ' +
	'video[controls], audio[controls], summary';

export const htmlTextInputsArray = [ 
	'password',
	'search',
	'tel',
	'text',
	'url'
];

export const KeyConstants: {
	ARROW_LEFT: string;
	ARROW_DOWN: string;
	ARROW_UP: string;
	ARROW_RIGHT: string;
} = {
	ARROW_LEFT: 'ArrowLeft',
	ARROW_DOWN: 'ArrowDown',
	ARROW_UP: 'ArrowUp',
	ARROW_RIGHT: 'ArrowRight',
};

export const checkboxRadioInputTypesArray = ['checkbox', 'radio'];

export function getActiveElement (): Element | null {
	let activeElement = document.activeElement;
	while (activeElement?.shadowRoot) {
		activeElement = activeElement.shadowRoot.activeElement
	}

	return activeElement;
}

// see https://github.com/GoogleChrome/inert-polyfill
export function isFocusable (element: HTMLElement, focusableList: string) {
	return element.matches(focusableList) &&
		!(element as any).disabled &&
		!/^-/.test(element.getAttribute('tabindex') || '') &&
		!element.hasAttribute('inert') && 
		(element.offsetWidth > 0 || element.offsetHeight > 0);
}

export function isShadowDomPolyfill () {
	return typeof ShadowRoot !== 'undefined' && 
	('polyfill' in ShadowRoot || !ShadowRoot.toString().includes('[native code]'));
}
