import Delta from 'quill-delta';
import Module from '../core/module.js';
import Quill from '../core/quill.js';
import type { Range } from '../core/selection.js';
import { deleteRange } from './keyboard.js';
import { WORD_JOINER } from '../core/constants.js';
import logger from '../core/logger.js';

const debug = logger('quill:input');

const INSERT_TYPES = ['insertText', 'insertReplacementText'];
const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent);
const IOS_DICTATION_MARKER = WORD_JOINER;
const IS_ANDROID = /Android/.test(navigator.userAgent);
const WHITESPACE_REGEX = /\s/;

class Input extends Module {
  constructor(quill: Quill, options: Record<string, never>) {
    super(quill, options);

    quill.root.addEventListener('beforeinput', (event) => {
      this.handleBeforeInput(event);
    });

    if (IS_IOS) {
      debug.log('Adding text change listener because of iOS');
      quill.on(Quill.events.TEXT_CHANGE, (delta, oldDelta, source) => {
        this.handleTextChange(delta, oldDelta, source);
      });
    }

    // Gboard with English input on Android triggers `compositionstart` sometimes even
    // users are not going to type anything.
    if (!IS_ANDROID) {
      quill.on(Quill.events.COMPOSITION_BEFORE_START, () => {
        this.handleCompositionStart();
      });
    }
  }

  private handleTextChange(delta: Delta, oldDelta: Delta, source: string) {
    debug.log('Text change', { delta, oldDelta, source });

    const currentText = this.quill.getText();
    const textStartsWithMarker = currentText[0] === IOS_DICTATION_MARKER;
    const textIsWhitespace = WHITESPACE_REGEX.test(currentText);
    const sourceIsApi = source === Quill.sources.API;

    if (IS_IOS && !textStartsWithMarker && sourceIsApi && textIsWhitespace) {
      debug.log('Inserting marker because of iOS');
      this.quill.insertText(0, IOS_DICTATION_MARKER, Quill.sources.SILENT);
    }
  }

  private deleteRange(range: Range) {
    deleteRange({ range, quill: this.quill });
  }

  private replaceText(range: Range, text: string | null | undefined = '') {
    if (range.length === 0) {
      debug.log('Range length is 0');
      return false;
    }

    if (text) {
      // Follow the native behavior that inherits the formats of the first character
      const formats = this.quill.getFormat(range.index, 1);
      this.deleteRange(range);
      this.quill.updateContents(
        new Delta().retain(range.index).insert(text, formats),
        Quill.sources.USER,
      );
    } else {
      this.deleteRange(range);
    }

    this.quill.setSelection(
      range.index + (text?.length ?? 0),
      0,
      Quill.sources.SILENT,
    );

    return true;
  }

  private handleBeforeInput(event: InputEvent) {
    debug.log('Handle before input', {
      event,
      composition: this.quill.composition.isComposing,
      prevented: event.defaultPrevented,
      inputType: event.inputType,
    });

    if (
      this.quill.composition.isComposing ||
      event.defaultPrevented ||
      !INSERT_TYPES.includes(event.inputType)
    ) {
      debug.log('handleBeforeInput: Skipping', {
        composition: this.quill.composition.isComposing,
        prevented: event.defaultPrevented,
        inputType: event.inputType,
      });
      return;
    }

    const staticRange = event.getTargetRanges
      ? event.getTargetRanges()[0]
      : null;

    if (!staticRange || staticRange.collapsed === true) {
      debug.log('handleBeforeInput: Static range is null or collapsed', {
        staticRange,
        collapsed: staticRange?.collapsed,
      });
      return;
    }

    const text = getPlainTextFromInputEvent(event);

    debug.log('handleBeforeInput: Text', text);

    if (text == null) {
      debug.log('handleBeforeInput: Text is null');
      return;
    }

    const normalized = this.quill.selection.normalizeNative(staticRange);

    const range = normalized
      ? this.quill.selection.normalizedToRange(normalized)
      : null;

    debug.log('handleBeforeInput: Range', range);

    if (range && this.replaceText(range, text)) {
      debug.log('handleBeforeInput: Preventing');
      event.preventDefault();

      const currentText = this.quill.getText();
      const currentTextStartsWithMarker =
        currentText[0] === IOS_DICTATION_MARKER;

      if (IS_IOS && currentTextStartsWithMarker) {
        debug.log('handleBeforeInput: Deleting marker', { text, currentText });
        this.quill.deleteText(0, 1, Quill.sources.SILENT);
      }
    }
  }

  private handleCompositionStart() {
    const range = this.quill.getSelection();
    if (range) {
      this.replaceText(range);
    }
  }
}

function getPlainTextFromInputEvent(event: InputEvent) {
  // When `inputType` is "insertText":
  // - `event.data` should be string (Safari uses `event.dataTransfer`).
  // - `event.dataTransfer` should be null.
  // When `inputType` is "insertReplacementText":
  // - `event.data` should be null.
  // - `event.dataTransfer` should contain "text/plain" data.

  if (typeof event.data === 'string') {
    return event.data;
  }

  if (event.dataTransfer?.types.includes('text/plain')) {
    return event.dataTransfer.getData('text/plain');
  }

  return null;
}

export default Input;
