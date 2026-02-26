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
     * Decorate a specific range of the document.
     *
     * Processes the full visible text directly and uses the syntax tree
     * only to find regions to skip (code blocks, inline code, escapes).
     * This avoids dependence on node names for text matching and produces
     * decorations in natural document order (no sorting crash).
     */
    private decorateRange(
        view: EditorView,
        builder: RangeSetBuilder<Decoration>,
        from: number,
        to: number
    ): void {
        const tree = syntaxTree(view.state);

        // Collect ranges to skip (code blocks, inline code, escapes)
        const skipRanges: { from: number; to: number }[] = [];
        tree.iterate({
            from,
            to,
            enter: (node) => {
                if (this.shouldSkipNode(node.name)) {
                    skipRanges.push({ from: node.from, to: node.to });
                    return false;
                }
            },
        });

        // Process the full visible text
        const text = view.state.doc.sliceString(from, to);
        const matches = text.matchAll(EMOJI_PATTERN);

        for (const match of matches) {
            const start = from + match.index;
            const end = start + match[0].length;

            // Skip matches inside code/escape ranges
            if (skipRanges.some((r) => start >= r.from && end <= r.to)) {
                continue;
            }

            const shortcode = match[1];
            const emoji = this.emojiManager.findByShortcode(shortcode);

            if (emoji) {
                const widget = new EmojiWidget(emoji, shortcode);
                const deco = Decoration.replace({
                    widget,
                    inclusive: false,
                });
                builder.add(start, end, deco);
            }
        }
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
}
