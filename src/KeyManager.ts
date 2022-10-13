/**
 * Adapted from https://github.com/nolanlawson/arrow-key-navigation
 */

//for NodeFilters, see: https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Traversal-NodeFilter

import { Orientation } from './Orientation';
import { 
	checkboxRadioInputTypesArray, 
	defaultFocusableSelectors,
	getActiveElement,
	htmlTextInputsArray,
	isFocusable,
	isShadowDomPolyfill,
	KeyConstants
} from './util';
import { closest } from 'kagekiri';

interface NodeFilter {
	acceptNode: (node: HTMLElement) => number;
}

export class KeyManager {
	private focusTrapTest: (element: Element) => boolean;
	private forwardKey: string;
	private backKey: string;
	private container: HTMLElement | Document;
	private focusableSelectors: string | null;

	constructor(container: HTMLElement, orientation: Orientation, focusableSelectors?: string) {
		this.container = container || document;
		this.focusableSelectors = focusableSelectors || defaultFocusableSelectors;
		this.focusTrapTest = (el: Element) => { 
			return el === this.container;
		};

		this.forwardKey = orientation === Orientation.HORIZONTAL ? KeyConstants.ARROW_RIGHT : KeyConstants.ARROW_DOWN;
		this.backKey = orientation === Orientation.HORIZONTAL ? KeyConstants.ARROW_LEFT : KeyConstants.ARROW_UP;
		
		this.register(container);
	}

	destroy() {
		this.unregister(this.container);
		this.focusTrapTest = () => {return false};
		this.container = null;
	}

	focusNextOrPrevious (event: KeyboardEvent, key: string) {
		let activeElement = getActiveElement() as HTMLElement;
		const forwardDirection = this.isForwardKey(key);

		if (activeElement && this.shouldIgnoreEvent(activeElement, forwardDirection)) {
			return;
		}

		
		if (!activeElement.matches(this.focusableSelectors)) {
			const arr = this.focusableSelectors.split(', ');
			let n = arr.length, i: number;

			for (i = 0; i < n; i++) {
				const el = closest(arr[i], activeElement);

				// TODO  investigate why getNextNode fails to return node via
				// 
				if (el && !el.shadowRoot) {
					let next = forwardDirection ? el.nextElementSibling : el.previousElementSibling;
					while(true) {
						if (next?.matches(arr[i])) {
							(next as HTMLElement).focus();
							event.preventDefault();
							return;
						}
						else {
							next = forwardDirection ? next?.nextElementSibling : next?.previousElementSibling;
							if (!next) {
								break;
							}
						}
					}
				}
				else if (el)  {
					activeElement = el as HTMLElement;
					break;
				}
			}
		}

		if (!activeElement) {
			return;
		}

		const root = this.getFocusTrapParent(activeElement) || activeElement.getRootNode() as HTMLElement;
		const nextNode = this.getNextNode(root as Element, activeElement, forwardDirection) as HTMLElement;

		if (nextNode && nextNode !== activeElement) {
			nextNode.focus();
			event.preventDefault();
		}
	}

	getFocusTrapParent (element: Element) {
		if (!this.focusTrapTest) {
			return;
		}

		let parent = element.parentElement;
		while (parent) {
			if (this.focusTrapTest(parent)) {
				return parent;
			}
			parent = parent.parentElement;
		}
	}

	shouldIgnoreEvent (activeElement: Element, forwardDirection: boolean) {
		const tagName = activeElement.tagName;
		const isTextarea = tagName === 'TEXTAREA';
		const activeElType = activeElement?.getAttribute('type')?.toLowerCase();
		const isTextInput = activeElType && tagName === 'INPUT' && htmlTextInputsArray.indexOf(activeElType) !== -1;
		const isContentEditable = activeElement.hasAttribute('contenteditable');

		if (!isTextarea && !isTextInput && !isContentEditable) {
			return false
		}

		let selectionStart: number | undefined;
		let selectionEnd: number | undefined;
		let len: number | undefined;

		if (isContentEditable) {
			const selection = getSelection();
			selectionStart = selection?.anchorOffset;
			selectionEnd = selection?.focusOffset;
			len = activeElement?.textContent?.length;
		} 
		else {
			const textEl = activeElement as any;
			selectionStart = textEl.selectionStart
			selectionEnd = textEl.selectionEnd
			len = textEl.value.length;
		}

		// if the cursor is inside of a textarea/input, then don't focus to the next/previous element
		// unless the cursor is at the beginning or the end
		if (!forwardDirection && selectionStart === selectionEnd && selectionStart === 0) {
			return false;
		} 
		else if (forwardDirection && selectionStart === selectionEnd && selectionStart === len) {
			return false;
		}

		return true;
	}

	getNextCandidateNodeForShadowDomPolyfill (root: Element, targetElement: Element | null, forwardDirection: boolean, filter: NodeFilter): Element | undefined {
		// When the shadydom polyfill is running, we can't use TreeWalker 
		// on ShadowRoots because they aren't real Nodes. So we do this 
		// workaround where we run TreeWalker on the children instead.
		let nodes = Array.prototype.slice.call(root.querySelectorAll('*'));
		let idx = nodes.indexOf(targetElement);

		if (forwardDirection) {
			nodes = nodes.slice(idx + 1)
		} 
		else {
			if (idx === -1) {
				idx = nodes.length;
			}
			nodes = nodes.slice(0, idx);
			nodes.reverse();
		}
		for (var i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node instanceof HTMLElement && filter.acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
				return node;
			}
		}

		return undefined;
	}

	getNextCandidateNode (root: Element, targetElement: Element | null, forwardDirection: boolean, filter: NodeFilter): Element {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);

		if (targetElement) {
			walker.currentNode = targetElement;
		}
		if (forwardDirection) {
			return walker.nextNode() as HTMLElement;
		} 
		else if (targetElement) {
			return walker.previousNode() as HTMLElement;
		}
		// iterating backwards through shadow root, use last child
		return walker.lastChild() as HTMLElement;
	}

	getNextNode (root: Element, targetElement: Element | null, forwardDirection: boolean): Element | undefined {
		const selectors = this.focusableSelectors;
		const filter: NodeFilter = {
			acceptNode: function (node: HTMLElement) {
				return (node === targetElement || node.shadowRoot || isFocusable(node, selectors))
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_SKIP
			}
		}

		let nextNode: Element | undefined;
		// TODO: remove this when we don't need to support the Shadow DOM polyfill
		if (isShadowDomPolyfill() && root instanceof ShadowRoot) {
			nextNode = this.getNextCandidateNodeForShadowDomPolyfill(root, targetElement, forwardDirection, filter);
		}
		else {
			nextNode = this.getNextCandidateNode(root, targetElement, forwardDirection, filter);
		}
	
		if (nextNode && nextNode.shadowRoot) { // push into the shadow DOM
			return this.getNextNode((nextNode as any).shadowRoot, null, forwardDirection);
		}

		const shadowRootHost = ((<unknown>root) as ShadowRoot).host;
		if (!nextNode && shadowRootHost) { // pop out of the shadow DOM
			return this.getNextNode((shadowRootHost as any).getRootNode(), shadowRootHost, forwardDirection);
		}

		return nextNode;
	}

	isForwardKey(key: string): boolean {
		return key === this.forwardKey;
	}

	handleEnter (event: KeyboardEvent) {
		const activeElement = getActiveElement();
		const type = activeElement?.getAttribute('type')?.toLowerCase();

		if (type && activeElement?.tagName === 'INPUT' && checkboxRadioInputTypesArray.indexOf(type) !== -1) {
			// Explicitly override "enter" on an input and make it fire the checkbox/radio
			(activeElement as HTMLInputElement).click();
			event.preventDefault();
		}
	}

	keyListener = (event: KeyboardEvent) => {
		if (event.altKey || event.metaKey || event.ctrlKey) {
			// ignore any modifiers (e.g., if using browser-native shortcuts)
			return;
		}

		const key = event.key;

		switch (key) {
			case this.forwardKey: 
			case this.backKey:
				this.focusNextOrPrevious(event, key);
				break;
			
			case 'Enter':
				this.handleEnter(event);
				break;
		}
	}

	register (container: HTMLElement | Document) {
		container.addEventListener('keydown', this.keyListener);
	}

	unregister (container: HTMLElement | Document) {
		container.removeEventListener('keydown', this.keyListener);
	}
}

