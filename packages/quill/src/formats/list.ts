import Block from '../blots/block.js';
import Container from '../blots/container.js';
import type Scroll from '../blots/scroll.js';
import Quill from '../core/quill.js';

class ListContainer extends Container {}
ListContainer.blotName = 'list-container';
ListContainer.tagName = 'OL';

class ListItem extends Block {
  static create(value: string) {
    const node = super.create() as HTMLElement;
    node.setAttribute('data-list', value);
    if (value === 'checked' || value === 'unchecked') {
      node.setAttribute('role', 'checkbox');
      node.setAttribute('aria-checked', value === 'checked' ? 'true' : 'false');
    } else {
      node.setAttribute('role', 'listitem');
    }
    return node;
  }

  static formats(domNode: HTMLElement) {
    return domNode.getAttribute('data-list') || undefined;
  }

  static register() {
    Quill.register(ListContainer);
  }

  constructor(scroll: Scroll, domNode: HTMLElement) {
    super(scroll, domNode);
    const ui = domNode.ownerDocument.createElement('span');
    // though the UI decoration is within the contenteditable, it should not be selectable
    ui.style.userSelect = 'none';
    ui.setAttribute('aria-hidden', 'true');

    const listEventHandler = (e: Event) => {
      if (!scroll.isEnabled()) return;
      const format = this.statics.formats(domNode, scroll);
      if (format === 'checked') {
        this.format('list', 'unchecked');
        e.preventDefault();
      } else if (format === 'unchecked') {
        this.format('list', 'checked');
        e.preventDefault();
      }
    };
    ui.addEventListener('mousedown', listEventHandler);
    ui.addEventListener('touchstart', listEventHandler);
    this.attachUI(ui);
  }

  format(name: string, value: string) {
    if (name === this.statics.blotName && value) {
      this.domNode.setAttribute('data-list', value);
      this.domNode.style.listStyleType = 'none';
      if (value === 'checked' || value === 'unchecked') {
        this.domNode.setAttribute('role', 'checkbox');
        this.domNode.setAttribute(
          'aria-checked',
          value === 'checked' ? 'true' : 'false',
        );
      } else {
        this.domNode.removeAttribute('role');
        this.domNode.removeAttribute('aria-checked');
        this.updateAriaLabel();
      }
    } else {
      super.format(name, value);
    }
  }

  insertAt(index: number, value: string, def?: unknown) {
    super.insertAt(index, value, def);
    this.updateAriaLabel();
  }

  deleteAt(index: number, length: number) {
    super.deleteAt(index, length);
    this.updateAriaLabel();
  }

  update(mutations: MutationRecord[], context: Record<string, unknown>): void {
    super.update(mutations, context);
    this.updateAriaLabel();
  }

  private updateAriaLabel() {
    const text = this.domNode?.textContent?.trim();
    if (!text) return;
    let prefix = '';
    const listType = this.domNode?.getAttribute('data-list');
    if (listType === 'ordered') {
      const siblings = Array.from(
        this.domNode.parentNode?.querySelectorAll('li[data-list="ordered"]') ??
          [],
      );
      const index = siblings.indexOf(this.domNode) + 1;
      prefix = `${index}. `;
    } else if (listType === 'bullet') {
      prefix = '• ';
    }
    this.domNode.setAttribute('aria-label', prefix + text);
  }
}
ListItem.blotName = 'list';
ListItem.tagName = 'LI';

ListContainer.allowedChildren = [ListItem];
ListItem.requiredContainer = ListContainer;

export { ListContainer, ListItem as default };
