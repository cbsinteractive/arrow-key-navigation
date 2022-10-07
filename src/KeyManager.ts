/**
 * Adapted from https://github.com/nolanlawson/arrow-key-navigation
 */

//for NodeFilters, see: https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Traversal-NodeFilter

import { Orientation } from "./Orientation";
import { checkboxRadioInputTypesArray, getActiveElement, htmlTextInputsArray, isFocusable, isShadowDomPolyfill, KeyConstants } from "./util";

interface NodeFilter {
	acceptNode: (node: HTMLElement) => number;
}

export class KeyManager {
	
	private focusTrapTest: (element: Element) => boolean;
	private forwardKey: string;

	constructor(private orientation: Orientation, container: HTMLElement) {
		this.focusTrapTest = (el: Element) => { 
			return el === container;
		};

		this.forwardKey = orientation === Orientation.HORIZONTAL ? KeyConstants.ARROW_RIGHT : KeyConstants.ARROW_DOWN;
		this.register();
	}

	destroy() {
		this.focusTrapTest = () => {return false};
		this.unregister();
	}

	focusNextOrPrevious (event: KeyboardEvent, key: string) {
		const activeElement = getActiveElement() as HTMLElement;
		const forwardDirection = this.isForwardKey(key);

		if (activeElement && this.shouldIgnoreEvent(activeElement, forwardDirection)) {
			return;
		}

		const root = this.getFocusTrapParent(activeElement) || activeElement.getRootNode();
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
		const filter: NodeFilter = {
			acceptNode: function (node: HTMLElement) {
				return (node === targetElement || node.shadowRoot || isFocusable(node))
				? NodeFilter.FILTER_ACCEPT
				: NodeFilter.FILTER_SKIP
			}
		}

		// TODO: remove this when we don't need to support the Shadow DOM polyfill
		let nextNode:Element | undefined;

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
			case 'ArrowLeft':
			case 'ArrowRight': 
			case 'ArrowUp': 
			case 'ArrowDown': 
				this.focusNextOrPrevious(event, key);
				break;
			
			case 'Enter':
				this.handleEnter(event);
				break;
		}
	}

	register () {
		document.addEventListener('keydown', this.keyListener);
	}

	unregister () {
		document.removeEventListener('keydown', this.keyListener);
	}
}

