import { Decoration, type DecorationSet, type EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EmojiManager } from '../emoji-manager';
import { EmojiWidget } from './emoji-widget';

/**
 * Pattern to match emoji shortcodes in text
 */
const EMOJI_PATTERN = /:([a-zA-Z0-9_+-]+):/g;

/**
 * Creates decorations for emoji in the editor
 */
export class EmojiDecorator {
    constructor(private emojiManager: EmojiManager) {}

    /**
     * Build decorations for the visible ranges of the editor
     */
    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        for (const { from, to } of view.visibleRanges) {
            this.decorateRange(view, builder, from, to);
        }

        return builder.finish();
    }

    /**
     * Decorate a specific range of the document
     */
    private decorateRange(
        view: EditorView,
        builder: RangeSetBuilder<Decoration>,
        from: number,
        to: number
    ): void {
        const tree = syntaxTree(view.state);

        tree.iterate({
            from,
            to,
            enter: (node) => {
                // Skip code blocks and inline code
                if (this.shouldSkipNode(node.name)) {
                    return false;
                }

                // Only process text nodes
                if (node.name !== 'Document' && !this.isTextNode(node.name)) {
                    return true;
                }

                // Get the text content of this node
                const text = view.state.doc.sliceString(node.from, node.to);

                // Find all emoji patterns in this text
                const matches = Array.from(text.matchAll(EMOJI_PATTERN));

                for (const match of matches) {
                    if (!match.index) continue;

                    const shortcode = match[1];
                    const emoji = this.emojiManager.findByShortcode(shortcode);

                    if (emoji) {
                        const start = node.from + match.index;
                        const end = start + match[0].length;

                        // Create a widget decoration to replace the :shortcode:
                        const widget = new EmojiWidget(emoji, shortcode);
                        const deco = Decoration.replace({
                            widget,
                            inclusive: false,
                        });

                        builder.add(start, end, deco);
                    }
                }

                return true;
            },
        });
    }

    /**
     * Check if a syntax node should be skipped (e.g., code blocks)
     */
    private shouldSkipNode(nodeName: string): boolean {
        return (
            nodeName.includes('code') ||
            nodeName.includes('Code') ||
            nodeName.includes('formatting') ||
            nodeName.includes('escape')
        );
    }

    /**
     * Check if a node is a text-containing node
     */
    private isTextNode(nodeName: string): boolean {
        // These are typical markdown text-containing nodes in CodeMirror
        return (
            nodeName === 'Document' ||
            nodeName.includes('inline') ||
            nodeName.includes('text') ||
            nodeName.includes('Text') ||
            nodeName.includes('paragraph') ||
            nodeName.includes('Paragraph') ||
            nodeName.includes('heading') ||
            nodeName.includes('Heading')
        );
    }
}
