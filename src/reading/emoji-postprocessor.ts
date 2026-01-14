import type { MarkdownPostProcessorContext } from 'obsidian';
import type { EmojiManager } from '../emoji-manager';
import type { Emoji } from '../types/emoji';

/**
 * Post-processes rendered markdown to replace :emoji: syntax with actual emoji
 * Used in reading mode
 */
export class EmojiPostProcessor {
    private readonly shortcodePattern = /:([\w+-]+):/g;

    constructor(private emojiManager: EmojiManager) {}

    /**
     * Process an HTML element to replace emoji shortcodes
     */
    process(element: HTMLElement, _context: MarkdownPostProcessorContext): void {
        // Don't process code blocks
        if (element.tagName === 'CODE' || element.tagName === 'PRE') {
            return;
        }

        // Walk through all text nodes
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

        const nodesToProcess: Array<{ node: Text; matches: RegExpMatchArray[] }> = [];

        let node: Node | null;
        while ((node = walker.nextNode())) {
            const textNode = node as Text;

            // Skip if parent is code
            if (this.isInCodeBlock(textNode)) {
                continue;
            }

            const matches = Array.from(textNode.textContent?.matchAll(this.shortcodePattern) ?? []);
            if (matches.length > 0) {
                nodesToProcess.push({ node: textNode, matches });
            }
        }

        // Process nodes (in reverse to preserve positions)
        for (const { node, matches } of nodesToProcess.reverse()) {
            this.replaceEmojisInTextNode(node, matches);
        }
    }

    /**
     * Check if a node is inside a code block
     */
    private isInCodeBlock(node: Node): boolean {
        let parent = node.parentElement;
        while (parent) {
            if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
                return true;
            }
            parent = parent.parentElement;
        }
        return false;
    }

    /**
     * Replace emoji shortcodes in a text node
     */
    private replaceEmojisInTextNode(node: Text, matches: RegExpMatchArray[]): void {
        const parent = node.parentElement;
        if (!parent) return;

        const text = node.textContent ?? '';
        const fragments: Array<string | HTMLElement> = [];
        let lastIndex = 0;

        for (const match of matches) {
            const matchIndex = match.index ?? 0;
            const shortcode = match[1];
            const emoji = this.emojiManager.findByShortcode(shortcode);

            // Add text before match
            if (matchIndex > lastIndex) {
                fragments.push(text.slice(lastIndex, matchIndex));
            }

            // Add emoji or keep original text
            if (emoji) {
                fragments.push(this.createEmojiElement(emoji));
            } else {
                fragments.push(match[0]); // Keep original :shortcode:
            }

            lastIndex = matchIndex + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            fragments.push(text.slice(lastIndex));
        }

        // Replace node with fragments
        for (const fragment of fragments) {
            if (typeof fragment === 'string') {
                parent.insertBefore(document.createTextNode(fragment), node);
            } else {
                parent.insertBefore(fragment, node);
            }
        }

        parent.removeChild(node);
    }

    /**
     * Create an HTML element for an emoji
     */
    private createEmojiElement(emoji: Emoji): HTMLElement {
        if (emoji.type === 'unicode') {
            const span = document.createElement('span');
            span.className = 'emoji emoji-unicode';
            span.textContent = emoji.unicode;
            span.setAttribute('data-emoji', emoji.shortcode);
            span.setAttribute('aria-label', emoji.label);
            span.setAttribute('title', `:${emoji.shortcode}:`);
            return span;
        } else {
            const img = document.createElement('img');
            img.className = 'emoji emoji-custom';
            img.src = emoji.data;
            img.alt = `:${emoji.shortcode}:`;
            img.setAttribute('data-emoji', emoji.shortcode);
            img.setAttribute('title', `:${emoji.shortcode}:`);
            return img;
        }
    }
}
