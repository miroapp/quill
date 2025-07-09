import Module from '../core/module.js';
import Quill from '../core/quill.js';
import type { Range } from '../core/selection.js';

export interface SuggestionsOptions {
  /**
   * Callback function to get inline suggestion text
   * Should return a Promise that resolves to suggestion text or null
   */
  getInlineSuggestion?: (context: SuggestionContext) => Promise<string | null>;

  /**
   * Enable/disable the suggestions module
   * @default true
   */
  enabled?: boolean;

  /**
   * Debounce delay for automatic suggestions (ms)
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Maximum length for suggestions
   * @default 200
   */
  maxSuggestionLength?: number;
}

export interface SuggestionContext {
  /** Current text in the editor */
  text: string;
  /** Current cursor position */
  index: number;
  /** Text before cursor */
  prefix: string;
  /** Text after cursor */
  suffix: string;
  /** Current selection range */
  range: Range | null;
  /** Current formatting at cursor */
  format: Record<string, unknown>;
}

class Suggestions extends Module<SuggestionsOptions> {
  static DEFAULTS: SuggestionsOptions = {
    enabled: true,
    debounceDelay: 300,
    maxSuggestionLength: 200,
    getInlineSuggestion: undefined,
  };

  private isActive = false;

  constructor(quill: Quill, options: Partial<SuggestionsOptions>) {
    super(quill, options);

    if (!this.options.enabled) return;

    this.setupKeyboardBindings();
    this.setupEventListeners();
  }

  private setupKeyboardBindings() {
    // Cmd+; (semicolon) to trigger suggestions
    this.quill.keyboard.addBinding(
      { key: ';', shortKey: true },
      this.triggerSuggestion.bind(this),
    );

    // Add our tab handler first - it will handle suggestions or pass through to default
    const keyboard = this.quill.getModule('keyboard') as any;
    
    // Create our tab handler
    const ourTabHandler = {
      key: 'Tab',
      handler: (range: Range, context: any) => {
        // Handle suggestions first
        if (this.isActive) {
          this.acceptSuggestion();
          return false; // Prevent default tab behavior
        }

        // Not in suggestion mode - let default tab behavior continue
        return true;
      },
    };

    // Ensure our handler runs first by prepending to the bindings array
    if (!keyboard.bindings) keyboard.bindings = {};
    if (!keyboard.bindings['Tab']) keyboard.bindings['Tab'] = [];
    
    // Insert our handler at the beginning
    keyboard.bindings['Tab'].unshift(ourTabHandler);

    // Escape to cancel suggestions
    this.quill.keyboard.addBinding({ key: 'Escape' }, (range: Range) => {
      if (this.isActive) {
        this.cancelSuggestion();
        return false; // Prevent default escape behavior
      }
    });
  }

  private setupEventListeners() {
    // Listen for selection changes to auto-cancel suggestions
    this.quill.on(
      Quill.events.SELECTION_CHANGE,
      (range: Range | null, oldRange: Range | null, source: string) => {
        if (this.isActive && range && oldRange) {
          // Cancel suggestions if cursor moves away from suggestion area
          if (range.index !== oldRange.index) {
            this.cancelSuggestion();
          }
        }
      },
    );
  }

  /**
   * Trigger inline suggestion at current cursor position
   */
  async triggerSuggestion(): Promise<void> {
    if (!this.options.enabled) return;

    // Get current range first, before any cancellation
    const range = this.quill.getSelection();
    if (!range || range.length > 0) return; // Only work with collapsed selection

    // If already active, cancel current suggestion first
    if (this.isActive) {
      this.cancelSuggestion();
      // Restore cursor position after cancellation
      this.quill.setSelection(range.index, 0);
    }

    const context = this.buildSuggestionContext(range);

    try {
      const suggestionText = await this.getSuggestionText(context);
      if (suggestionText && suggestionText.trim()) {
        this.showSuggestion(suggestionText, range.index);
      }
    } catch (error) {
      console.warn('Failed to get suggestion:', error);
    }
  }

  /**
   * Accept the current suggestion
   */
  acceptSuggestion(): void {
    if (!this.isActive) return;

    // Use Quill's built-in suggestions API
    const changes = this.quill.suggestionsAccept();
    this.isActive = false;

    // Emit custom event for external listeners
    this.quill.emitter.emit('suggestion-accepted', changes);
  }

  /**
   * Cancel the current suggestion
   */
  cancelSuggestion(): void {
    if (!this.isActive) return;

    // Use Quill's built-in suggestions API
    this.quill.suggestionsCancel();
    this.isActive = false;

    // Emit custom event for external listeners
    this.quill.emitter.emit('suggestion-cancelled');
  }

  /**
   * Check if suggestions are currently active
   */
  isActiveState(): boolean {
    return this.isActive;
  }

  private buildSuggestionContext(range: Range): SuggestionContext {
    const text = this.quill.getText();
    const index = range.index;
    const prefix = text.substring(0, index);
    const suffix = text.substring(index);
    const format = this.quill.getFormat(range);

    return {
      text,
      index,
      prefix,
      suffix,
      range,
      format,
    };
  }

  private async getSuggestionText(
    context: SuggestionContext,
  ): Promise<string | null> {
    if (this.options.getInlineSuggestion) {
      return await this.options.getInlineSuggestion(context);
    }

    // Default mock suggestion for development
    return this.getDefaultSuggestion(context);
  }

  private getDefaultSuggestion(context: SuggestionContext): string {
    const mockSuggestions = [
      ' This is an AI-generated suggestion based on your content.',
      " Here's a contextual completion for your text.",
      ' Consider adding this relevant information to enhance your writing.',
      ' This suggestion continues your thought with additional context.',
    ];

    // Simple context-aware selection
    const lastWord = context.prefix.split(/\s+/).pop() || '';
    const suggestionIndex = lastWord.length % mockSuggestions.length;

    return mockSuggestions[suggestionIndex];
  }

  private showSuggestion(text: string, index: number): void {
    // Truncate if too long
    if (
      this.options.maxSuggestionLength &&
      text.length > this.options.maxSuggestionLength
    ) {
      text = text.substring(0, this.options.maxSuggestionLength) + '...';
    }

    // Use Quill's built-in suggestions API
    this.quill.suggestionsStart();
    this.quill.insertText(index, text);
    this.isActive = true;

    // Emit custom event for external listeners
    this.quill.emitter.emit('suggestion-shown', { text, index });
  }
}

export default Suggestions;
