import { describe, it, expect, beforeEach } from 'vitest';
import { EmojiPostProcessor } from './emoji-postprocessor';
import { EmojiManager } from '../emoji-manager';
import type { CustomEmoji } from '../types/emoji';

describe('EmojiPostProcessor', () => {
    let manager: EmojiManager;
    let processor: EmojiPostProcessor;

    beforeEach(async () => {
        manager = new EmojiManager();
        await manager.loadUnicodeEmojis();
        processor = new EmojiPostProcessor(manager);
    });

    const createMockContext = (): any => ({
        sourcePath: 'test.md',
        frontmatter: {},
    });

    describe('process', () => {
        it('should replace Unicode emoji shortcode with emoji character', () => {
            const element = document.createElement('p');
            element.textContent = 'I like this :thumbsup:';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan).toBeDefined();
            expect(emojiSpan?.textContent).toBe('👍');
        });

        it('should replace emoji shortcode by alias', () => {
            const element = document.createElement('p');
            element.textContent = 'I like this :+1:';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan).toBeDefined();
            expect(emojiSpan?.textContent).toBe('👍');
        });

        it('should handle multiple emoji in same text', () => {
            const element = document.createElement('p');
            element.textContent = 'Hello :wave: I like this :thumbsup:';

            processor.process(element, createMockContext());

            const emojiSpans = element.querySelectorAll('.emoji-unicode');
            expect(emojiSpans.length).toBe(2);
        });

        it('should preserve text around emoji', () => {
            const element = document.createElement('p');
            element.textContent = 'Before :thumbsup: after';

            processor.process(element, createMockContext());

            const text = element.textContent;
            expect(text).toContain('Before');
            expect(text).toContain('👍');
            expect(text).toContain('after');
        });

        it('should not replace invalid shortcodes', () => {
            const element = document.createElement('p');
            element.textContent = 'This :invalid_emoji_xyz: does not exist';

            processor.process(element, createMockContext());

            expect(element.textContent).toContain(':invalid_emoji_xyz:');
            expect(element.querySelector('.emoji')).toBeNull();
        });

        it('should handle emoji at start of text', () => {
            const element = document.createElement('p');
            element.textContent = ':thumbsup: at start';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan).toBeDefined();
            expect(element.textContent).toContain('at start');
        });

        it('should handle emoji at end of text', () => {
            const element = document.createElement('p');
            element.textContent = 'At end :thumbsup:';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan).toBeDefined();
            expect(element.textContent).toContain('At end');
        });

        it('should handle consecutive emoji', () => {
            const element = document.createElement('p');
            element.textContent = ':thumbsup::thumbsup:';

            processor.process(element, createMockContext());

            const emojiSpans = element.querySelectorAll('.emoji-unicode');
            expect(emojiSpans.length).toBe(2);
        });

        it('should not process code blocks', () => {
            const element = document.createElement('code');
            element.textContent = ':thumbsup:';

            processor.process(element, createMockContext());

            expect(element.textContent).toBe(':thumbsup:');
            expect(element.querySelector('.emoji')).toBeNull();
        });

        it('should not process text inside code tags', () => {
            const element = document.createElement('p');
            element.innerHTML = 'Regular :thumbsup: but not <code>:thumbsup:</code>';

            processor.process(element, createMockContext());

            const emojiSpans = element.querySelectorAll('.emoji-unicode');
            expect(emojiSpans.length).toBe(1); // Only the one outside code

            const code = element.querySelector('code');
            expect(code?.textContent).toBe(':thumbsup:');
        });

        it('should add data attributes to emoji span', () => {
            const element = document.createElement('p');
            element.textContent = ':thumbsup:';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan?.getAttribute('data-emoji')).toBe('thumbsup');
            expect(emojiSpan?.getAttribute('aria-label')).toBeTruthy();
            expect(emojiSpan?.getAttribute('title')).toBe(':thumbsup:');
        });

        it('should render custom emoji as img', () => {
            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'custom_logo',
                filename: 'logo.png',
                filepath: '.obsidian/emoji/logo.png',
                data: 'data:image/png;base64,fakedata',
                aliases: ['logo'],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const element = document.createElement('p');
            element.textContent = 'My :custom_logo: here';

            processor.process(element, createMockContext());

            const img = element.querySelector('img.emoji-custom') as HTMLImageElement;
            expect(img).toBeDefined();
            expect(img?.src).toContain('data:image/png;base64,fakedata');
            expect(img?.alt).toBe(':custom_logo:');
        });

        it('should render custom emoji by alias', () => {
            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'custom_logo',
                filename: 'logo.png',
                filepath: '.obsidian/emoji/logo.png',
                data: 'data:image/png;base64,fakedata',
                aliases: ['logo'],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const element = document.createElement('p');
            element.textContent = 'My :logo: here';

            processor.process(element, createMockContext());

            const img = element.querySelector('img.emoji-custom');
            expect(img).toBeDefined();
        });

        it('should handle nested HTML structure', () => {
            const element = document.createElement('div');
            element.innerHTML = '<p>Paragraph :thumbsup:</p><p>Another :wave:</p>';

            processor.process(element, createMockContext());

            const emojiSpans = element.querySelectorAll('.emoji-unicode');
            expect(emojiSpans.length).toBe(2);
        });

        it('should handle empty text nodes gracefully', () => {
            const element = document.createElement('p');
            element.innerHTML = '<span></span>:thumbsup:<span></span>';

            processor.process(element, createMockContext());

            const emojiSpan = element.querySelector('.emoji-unicode');
            expect(emojiSpan).toBeDefined();
        });
    });
});
