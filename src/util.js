"use strict";
exports.__esModule = true;
exports.isShadowDomPolyfill = exports.isFocusable = exports.getActiveElement = exports.checkboxRadioInputTypesArray = exports.KeyConstants = exports.htmlTextInputsArray = exports.focusableSelectors = void 0;
// This query is adapted from a11y-dialog
// https://github.com/edenspiekermann/a11y-dialog/blob/cf4ed81/a11y-dialog.js#L6-L18
exports.focusableSelectors = 'a[href], area[href], input, select, textarea, ' +
    'button, iframe, object, embed, [contenteditable], [tabindex], ' +
    'video[controls], audio[controls], summary';
exports.htmlTextInputsArray = [
    'password',
    'search',
    'tel',
    'text',
    'url'
];
exports.KeyConstants = {
    ARROW_LEFT: 'ArrowLeft',
    ARROW_DOWN: 'ArrowDown',
    ARROW_UP: 'ArrowUp',
    ARROW_RIGHT: 'ArrowRight'
};
exports.checkboxRadioInputTypesArray = ['checkbox', 'radio'];
function getActiveElement() {
    var activeElement = document.activeElement;
    while (activeElement === null || activeElement === void 0 ? void 0 : activeElement.shadowRoot) {
        activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
}
exports.getActiveElement = getActiveElement;
function isFocusable(element) {
    return element.matches(exports.focusableSelectors) &&
        !element.disabled &&
        !/^-/.test(element.getAttribute('tabindex') || '') &&
        !element.hasAttribute('inert') && // see https://github.com/GoogleChrome/inert-polyfill
        (element.offsetWidth > 0 || element.offsetHeight > 0);
}
exports.isFocusable = isFocusable;
function isShadowDomPolyfill() {
    return typeof ShadowRoot !== 'undefined' &&
        ('polyfill' in ShadowRoot || !ShadowRoot.toString().includes('[native code]'));
}
exports.isShadowDomPolyfill = isShadowDomPolyfill;
