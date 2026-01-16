import { EditorSuggest } from 'obsidian';
import type { App, Editor, EditorPosition, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import type { EmojiManager } from '../emoji-manager';
import type { Emoji } from '../types/emoji';

/**
 * Autocomplete suggester for emoji shortcodes
 * Shows emoji suggestions when typing :shortcode
 */
export class EmojiSuggester extends EditorSuggest<Emoji> {
    private emojiManager: EmojiManager;
    private minChars: number;

    constructor(app: App, emojiManager: EmojiManager, minChars = 2) {
        super(app);
        this.emojiManager = emojiManager;
        this.minChars = minChars;
    }

    /**
     * Detect when to trigger suggestions
     * Triggers when user types : followed by at least minChars characters
     */
    onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
        // Get text from start of line to cursor
        const line = editor.getLine(cursor.line);
        const textBeforeCursor = line.substring(0, cursor.ch);

        // Look for :query pattern
        const regex = /:([a-zA-Z0-9_-]*)$/;
        const match = regex.exec(textBeforeCursor);
        if (!match) return null;

        const query = match[1];

        // Only trigger if query meets minimum length
        if (query.length < this.minChars) return null;

        return {
            start: { line: cursor.line, ch: cursor.ch - query.length - 1 }, // Include the :
            end: cursor,
            query,
        };
    }

    /**
     * Get suggestions for the query
     */
    getSuggestions(context: EditorSuggestContext): Emoji[] {
        const query = context.query;
        return this.emojiManager.searchEmojis(query, 20);
    }

    /**
     * Render a suggestion item
     */
    renderSuggestion(emoji: Emoji, el: HTMLElement): void {
        el.addClass('emoji-suggestion');

        // Preview
        if (emoji.type === 'unicode') {
            const preview = el.createSpan({ cls: 'emoji-preview' });
            preview.textContent = emoji.unicode;
        } else {
            const preview = el.createEl('img', { cls: 'emoji-preview' });
            preview.src = emoji.data;
            preview.alt = `:${emoji.shortcode}:`;
        }

        // Shortcode
        const shortcodeEl = el.createSpan({ cls: 'emoji-shortcode' });
        shortcodeEl.textContent = `:${emoji.shortcode}:`;

        // Label (Unicode only)
        if (emoji.type === 'unicode') {
            const labelEl = el.createSpan({ cls: 'emoji-label' });
            labelEl.textContent = emoji.label;
        }
    }

    /**
     * Select a suggestion and insert it
     */
    selectSuggestion(emoji: Emoji, _evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;

        const { editor, start, end } = this.context;

        // Replace :query with :shortcode:
        const replacement = `:${emoji.shortcode}:`;
        editor.replaceRange(replacement, start, end);

        // Move cursor to end of replacement
        const newCursor = {
            line: start.line,
            ch: start.ch + replacement.length,
        };
        editor.setCursor(newCursor);
    }
}
