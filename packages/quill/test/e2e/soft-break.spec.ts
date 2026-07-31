import { expect } from '@playwright/test';
import { test } from './fixtures/index.js';
import { SHORTKEY } from './utils/index.js';

const SOFT_BREAK = '\u2028';

test.describe('soft break', () => {
  test('formatting a collapsed selection on the trailing line after soft-breaks does not crash', async ({
    page,
    editorPage,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await editorPage.open();
    await editorPage.setContents([
      { insert: `We Have:${SOFT_BREAK}`, attributes: { bold: true } },
      { insert: `${SOFT_BREAK}\n` },
    ]);

    // Verify the soft-breaks are present in the DOM
    const softBreaks = await page.locator('.soft-break').count();
    expect(softBreaks).toBe(2);

    // Place the caret at the end of the document (trailing empty line)
    await page.evaluate(() => {
      // @ts-expect-error
      const quill = window.quill;
      quill.setSelection(quill.getLength() - 1, 0, 'silent');
    });

    await page.keyboard.press(`${SHORTKEY}+b`);
    await page.keyboard.type('x');

    expect(
      pageErrors.filter((e) => e.message.includes('optimize iterations')),
    ).toEqual([]);
    expect(await editorPage.getContents()).toEqual([
      { insert: `We Have:${SOFT_BREAK}`, attributes: { bold: true } },
      { insert: SOFT_BREAK },
      { insert: 'x', attributes: { bold: true } },
      { insert: '\n' },
    ]);
  });
});
