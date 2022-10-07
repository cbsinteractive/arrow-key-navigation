"use strict";
/**
 * Adapted from https://github.com/nolanlawson/arrow-key-navigation
 */
exports.__esModule = true;
exports.KeyManager = void 0;
//for NodeFilters, see: https://www.w3.org/TR/DOM-Level-2-Traversal-Range/traversal.html#Traversal-NodeFilter
var Orientation_1 = require("./Orientation");
var util_1 = require("./util");
var KeyManager = /** @class */ (function () {
    function KeyManager(orientation, container) {
        var _this = this;
        this.orientation = orientation;
        this.keyListener = function (event) {
            if (event.altKey || event.metaKey || event.ctrlKey) {
                // ignore any modifiers (e.g., if using browser-native shortcuts)
                return;
            }
            var key = event.key;
            switch (key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    _this.focusNextOrPrevious(event, key);
                    break;
                case 'Enter':
                    _this.handleEnter(event);
                    break;
            }
        };
        this.focusTrapTest = function (el) {
            return el === container;
        };
        this.forwardKey = orientation === Orientation_1.Orientation.HORIZONTAL ? util_1.KeyConstants.ARROW_RIGHT : util_1.KeyConstants.ARROW_DOWN;
        this.register();
    }
    KeyManager.prototype.destroy = function () {
        this.focusTrapTest = function () { return false; };
        this.unregister();
    };
    KeyManager.prototype.focusNextOrPrevious = function (event, key) {
        var activeElement = util_1.getActiveElement();
        var forwardDirection = this.isForwardKey(key);
        if (activeElement && this.shouldIgnoreEvent(activeElement, forwardDirection)) {
            return;
        }
        var root = this.getFocusTrapParent(activeElement) || activeElement.getRootNode();
        var nextNode = this.getNextNode(root, activeElement, forwardDirection);
        if (nextNode && nextNode !== activeElement) {
            nextNode.focus();
            event.preventDefault();
        }
    };
    KeyManager.prototype.getFocusTrapParent = function (element) {
        if (!this.focusTrapTest) {
            return;
        }
        var parent = element.parentElement;
        while (parent) {
            if (this.focusTrapTest(parent)) {
                return parent;
            }
            parent = parent.parentElement;
        }
    };
    KeyManager.prototype.shouldIgnoreEvent = function (activeElement, forwardDirection) {
        var _a, _b;
        var tagName = activeElement.tagName;
        var isTextarea = tagName === 'TEXTAREA';
        var activeElType = (_a = activeElement === null || activeElement === void 0 ? void 0 : activeElement.getAttribute('type')) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        var isTextInput = activeElType && tagName === 'INPUT' && util_1.htmlTextInputsArray.indexOf(activeElType) !== -1;
        var isContentEditable = activeElement.hasAttribute('contenteditable');
        if (!isTextarea && !isTextInput && !isContentEditable) {
            return false;
        }
        var selectionStart;
        var selectionEnd;
        var len;
        if (isContentEditable) {
            var selection = getSelection();
            selectionStart = selection === null || selection === void 0 ? void 0 : selection.anchorOffset;
            selectionEnd = selection === null || selection === void 0 ? void 0 : selection.focusOffset;
            len = (_b = activeElement === null || activeElement === void 0 ? void 0 : activeElement.textContent) === null || _b === void 0 ? void 0 : _b.length;
        }
        else {
            var textEl = activeElement;
            selectionStart = textEl.selectionStart;
            selectionEnd = textEl.selectionEnd;
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
    };
    KeyManager.prototype.getNextCandidateNodeForShadowDomPolyfill = function (root, targetElement, forwardDirection, filter) {
        // When the shadydom polyfill is running, we can't use TreeWalker 
        // on ShadowRoots because they aren't real Nodes. So we do this 
        // workaround where we run TreeWalker on the children instead.
        var nodes = Array.prototype.slice.call(root.querySelectorAll('*'));
        var idx = nodes.indexOf(targetElement);
        if (forwardDirection) {
            nodes = nodes.slice(idx + 1);
        }
        else {
            if (idx === -1) {
                idx = nodes.length;
            }
            nodes = nodes.slice(0, idx);
            nodes.reverse();
        }
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node instanceof HTMLElement && filter.acceptNode(node) === NodeFilter.FILTER_ACCEPT) {
                return node;
            }
        }
        return undefined;
    };
    KeyManager.prototype.getNextCandidateNode = function (root, targetElement, forwardDirection, filter) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);
        if (targetElement) {
            walker.currentNode = targetElement;
        }
        if (forwardDirection) {
            return walker.nextNode();
        }
        else if (targetElement) {
            return walker.previousNode();
        }
        // iterating backwards through shadow root, use last child
        return walker.lastChild();
    };
    KeyManager.prototype.getNextNode = function (root, targetElement, forwardDirection) {
        var filter = {
            acceptNode: function (node) {
                return (node === targetElement || node.shadowRoot || util_1.isFocusable(node))
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            }
        };
        // TODO: remove this when we don't need to support the Shadow DOM polyfill
        var nextNode;
        if (util_1.isShadowDomPolyfill() && root instanceof ShadowRoot) {
            nextNode = this.getNextCandidateNodeForShadowDomPolyfill(root, targetElement, forwardDirection, filter);
        }
        else {
            nextNode = this.getNextCandidateNode(root, targetElement, forwardDirection, filter);
        }
        if (nextNode && nextNode.shadowRoot) { // push into the shadow DOM
            return this.getNextNode(nextNode.shadowRoot, null, forwardDirection);
        }
        var shadowRootHost = root.host;
        if (!nextNode && shadowRootHost) { // pop out of the shadow DOM
            return this.getNextNode(shadowRootHost.getRootNode(), shadowRootHost, forwardDirection);
        }
        return nextNode;
    };
    KeyManager.prototype.isForwardKey = function (key) {
        return key === this.forwardKey;
    };
    KeyManager.prototype.handleEnter = function (event) {
        var _a;
        var activeElement = util_1.getActiveElement();
        var type = (_a = activeElement === null || activeElement === void 0 ? void 0 : activeElement.getAttribute('type')) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (type && (activeElement === null || activeElement === void 0 ? void 0 : activeElement.tagName) === 'INPUT' && util_1.checkboxRadioInputTypesArray.indexOf(type) !== -1) {
            // Explicitly override "enter" on an input and make it fire the checkbox/radio
            activeElement.click();
            event.preventDefault();
        }
    };
    KeyManager.prototype.register = function () {
        document.addEventListener('keydown', this.keyListener);
    };
    KeyManager.prototype.unregister = function () {
        document.removeEventListener('keydown', this.keyListener);
    };
    return KeyManager;
}());
exports.KeyManager = KeyManager;
