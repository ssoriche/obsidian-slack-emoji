import { WidgetType } from '@codemirror/view';
import type { Emoji } from '../types/emoji';

/**
 * CodeMirror 6 widget that renders an emoji in the editor
 */
export class EmojiWidget extends WidgetType {
    constructor(
        private emoji: Emoji,
        private matchedShortcode: string
    ) {
        super();
    }

    /**
     * Render the emoji as a DOM element
     */
    toDOM(): HTMLElement {
        if (this.emoji.type === 'unicode') {
            const span = document.createElement('span');
            span.className = 'emoji emoji-unicode cm-emoji';
            span.textContent = this.emoji.unicode;
            span.setAttribute('data-emoji', this.emoji.shortcode);
            span.setAttribute('aria-label', this.emoji.label);
            span.setAttribute('title', `:${this.matchedShortcode}:`);
            return span;
        } else {
            const img = document.createElement('img');
            img.className = 'emoji emoji-custom cm-emoji';
            img.src = this.emoji.data;
            img.alt = `:${this.matchedShortcode}:`;
            img.setAttribute('data-emoji', this.emoji.shortcode);
            img.setAttribute('title', `:${this.matchedShortcode}:`);
            return img;
        }
    }

    /**
     * Determine if this widget is equivalent to another
     * Used by CodeMirror to decide whether to reuse DOM nodes
     */
    eq(other: EmojiWidget): boolean {
        return (
            this.emoji.type === other.emoji.type &&
            this.emoji.shortcode === other.emoji.shortcode &&
            this.matchedShortcode === other.matchedShortcode
        );
    }

    /**
     * Don't ignore events on the widget
     */
    ignoreEvent(): boolean {
        return false;
    }
}
