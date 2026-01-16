import { describe, it, expect, beforeEach } from 'vitest';
import { EmojiWidget } from './emoji-widget';
import type { UnicodeEmoji, CustomEmoji } from '../types/emoji';

describe('EmojiWidget', () => {
    let unicodeEmoji: UnicodeEmoji;
    let customEmoji: CustomEmoji;

    beforeEach(() => {
        unicodeEmoji = {
            type: 'unicode',
            unicode: '👍',
            hexcode: '1F44D',
            label: 'Thumbs Up',
            shortcode: '+1',
            aliases: ['thumbsup', 'thumbup'],
            category: 'people-body',
        };

        customEmoji = {
            type: 'custom',
            shortcode: 'custom_logo',
            filepath: '.obsidian/emoji/logo.png',
            data: 'data:image/png;base64,fake',
            aliases: ['logo', 'brand'],
            addedDate: Date.now(),
        };
    });

    describe('toDOM', () => {
        it('should render Unicode emoji as span', () => {
            const widget = new EmojiWidget(unicodeEmoji, 'thumbsup');
            const element = widget.toDOM();

            expect(element.tagName).toBe('SPAN');
            expect(element.className).toContain('emoji');
            expect(element.className).toContain('emoji-unicode');
            expect(element.className).toContain('cm-emoji');
            expect(element.textContent).toContain('👍');
            expect(element.getAttribute('data-emoji')).toBe('+1');
            expect(element.getAttribute('aria-label')).toBe('Thumbs Up');
            expect(element.getAttribute('title')).toBe(':thumbsup:');
        });

        it('should render custom emoji as img', () => {
            const widget = new EmojiWidget(customEmoji, 'logo');
            const element = widget.toDOM();

            expect(element.tagName).toBe('IMG');
            expect(element.className).toContain('emoji');
            expect(element.className).toContain('emoji-custom');
            expect(element.className).toContain('cm-emoji');
            expect((element as HTMLImageElement).src).toBe('data:image/png;base64,fake');
            expect((element as HTMLImageElement).alt).toBe(':logo:');
            expect(element.getAttribute('data-emoji')).toBe('custom_logo');
            expect(element.getAttribute('title')).toBe(':logo:');
        });

        it('should preserve matched shortcode in title', () => {
            const widget1 = new EmojiWidget(unicodeEmoji, 'thumbsup');
            const widget2 = new EmojiWidget(unicodeEmoji, '+1');

            const element1 = widget1.toDOM();
            const element2 = widget2.toDOM();

            expect(element1.getAttribute('title')).toBe(':thumbsup:');
            expect(element2.getAttribute('title')).toBe(':+1:');
        });
    });

    describe('eq', () => {
        it('should return true for identical widgets', () => {
            const widget1 = new EmojiWidget(unicodeEmoji, 'thumbsup');
            const widget2 = new EmojiWidget(unicodeEmoji, 'thumbsup');

            expect(widget1.eq(widget2)).toBe(true);
        });

        it('should return false for different emoji', () => {
            const widget1 = new EmojiWidget(unicodeEmoji, 'thumbsup');
            const widget2 = new EmojiWidget(customEmoji, 'logo');

            expect(widget1.eq(widget2)).toBe(false);
        });

        it('should return false for different matched shortcodes', () => {
            const widget1 = new EmojiWidget(unicodeEmoji, 'thumbsup');
            const widget2 = new EmojiWidget(unicodeEmoji, '+1');

            expect(widget1.eq(widget2)).toBe(false);
        });
    });

    describe('ignoreEvent', () => {
        it('should return false to allow events', () => {
            const widget = new EmojiWidget(unicodeEmoji, 'thumbsup');

            expect(widget.ignoreEvent()).toBe(false);
        });
    });
});
