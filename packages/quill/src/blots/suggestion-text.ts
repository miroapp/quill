import Inline from './inline.js';

class SuggestionTextBlot extends Inline {
  static blotName = 'suggestion-text';
  static className = 'ql-suggestion-text';
  static tagName = 'SPAN';

  static create() {
    const node = super.create();
    // Don't use contenteditable=false as it disrupts cursor positioning
    // Instead rely on CSS to make it non-interactive
    node.classList.add(this.className);
    return node;
  }

  static formats() {
    return true;
  }

  // Prevent merging with regular inline blots
  optimize() {
    // Skip optimization to maintain suggestion separation
  }
}

export default SuggestionTextBlot;
