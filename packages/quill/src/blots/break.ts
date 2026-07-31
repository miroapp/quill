import { EmbedBlot, LeafBlot, ParentBlot } from 'parchment';
import type { Blot } from 'parchment';
import Cursor from './cursor.js';
import SoftBreak from './soft-break.js';

const isCursor = (blot: Blot | null | undefined): boolean =>
  blot != null && blot.statics.blotName === Cursor.blotName;

const findPrevContentLeaf = (start: Blot | null): Blot | null => {
  let prev = start;
  while (prev != null) {
    if (isCursor(prev)) {
      prev = prev.prev;
      continue;
    }
    if (prev instanceof ParentBlot) {
      const leaf = prev
        .descendants(LeafBlot)
        .filter((descendant) => !isCursor(descendant))
        .at(-1);
      if (leaf != null) {
        return leaf;
      }
      prev = prev.prev;
      continue;
    }
    return prev;
  }
  return null;
};

class Break extends EmbedBlot {
  static value() {
    return undefined;
  }

  optimize(): void {
    let next: Blot | null = this.next;
    while (isCursor(next)) {
      next = next!.next;
    }
    const thisIsLastBlotInParent = next == null;
    const thisIsFirstBlotInParent = this.prev == null;
    const thisIsOnlyBlotInParent =
      thisIsLastBlotInParent && thisIsFirstBlotInParent;
    const prevLeaf = findPrevContentLeaf(this.prev);
    const prevLeafIsSoftBreak =
      prevLeaf != null && prevLeaf.statics.blotName === SoftBreak.blotName;
    const shouldRender =
      thisIsOnlyBlotInParent || (thisIsLastBlotInParent && prevLeafIsSoftBreak);
    if (!shouldRender) {
      this.remove();
    }
  }

  length() {
    return 0;
  }

  value() {
    return '';
  }
}
Break.blotName = 'break';
Break.tagName = 'BR';

export default Break;
