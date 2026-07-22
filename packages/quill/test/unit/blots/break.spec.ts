import { describe, expect, test } from 'vitest';
import Selection, { Range } from '../../../src/core/selection.js';
import Bold from '../../../src/formats/bold.js';
import { createRegistry, createScroll } from '../__helpers__/factory.js';

const SANDWICH_HTML =
  '<p><strong>We Have:<br class="soft-break"></strong><br class="soft-break"><br></p>';

const createSelection = (html: string) => {
  const scroll = createScroll(html, createRegistry([Bold]));
  return new Selection(scroll, scroll.emitter);
};

describe('Break', () => {
  test('collapsed-selection format at a soft-break/inline boundary does not oscillate', () => {
    const selection = createSelection(SANDWICH_HTML);
    // Caret on the trailing empty line, as when a user clicks into it.
    selection.setRange(new Range(selection.scroll.length() - 1, 0));

    expect(() => selection.format('bold', true)).not.toThrow();
  });

  test('trailing break after a soft-break still renders after formatting', () => {
    const selection = createSelection(SANDWICH_HTML);
    selection.setRange(new Range(selection.scroll.length() - 1, 0));
    selection.format('bold', true);
    selection.scroll.optimize();

    const lastChild = selection.scroll.domNode.querySelector('p')?.lastElementChild;
    expect(lastChild?.tagName).toBe('BR');
  });
});
