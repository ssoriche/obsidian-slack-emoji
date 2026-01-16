import { describe, it, expect, beforeEach } from 'vitest';
import { EmojiManager } from './emoji-manager';
import type { CustomEmoji } from './types/emoji';

describe('EmojiManager', () => {
    let manager: EmojiManager;

    beforeEach(() => {
        manager = new EmojiManager();
    });

    describe('loadUnicodeEmojis', () => {
        it('should load Unicode emoji successfully', async () => {
            await manager.loadUnicodeEmojis();

            const stats = manager.getStats();
            expect(stats.unicode).toBeGreaterThan(0);
            expect(stats.totalAliases).toBeGreaterThan(0);
        });

        it('should make emoji findable by canonical shortcode', async () => {
            await manager.loadUnicodeEmojis();

            const emoji = manager.findByShortcode('thumbsup');
            expect(emoji).toBeDefined();
            expect(emoji?.type).toBe('unicode');
            // Unicode may include variation selectors, just check it contains thumbs up
            expect(emoji?.unicode).toContain('👍');
        });

        it('should make emoji findable by alias', async () => {
            await manager.loadUnicodeEmojis();

            // Try to find thumbsup by common alias
            const emoji = manager.findByShortcode('+1');
            expect(emoji).toBeDefined();
            expect(emoji?.unicode).toContain('👍');
        });

        it('should resolve both canonical and alias to same emoji', async () => {
            await manager.loadUnicodeEmojis();

            const byCanonical = manager.findByShortcode('thumbsup');
            const byAlias = manager.findByShortcode('+1');

            expect(byCanonical).toBeDefined();
            expect(byAlias).toBeDefined();
            expect(byCanonical?.unicode).toBe(byAlias?.unicode);
        });
    });

    describe('custom emoji management', () => {
        const createCustomEmoji = (shortcode: string, aliases: string[] = []): CustomEmoji => ({
            type: 'custom',
            shortcode,
            filename: `${shortcode}.png`,
            filepath: `.obsidian/emoji/${shortcode}.png`,
            data: 'data:image/png;base64,fake',
            aliases,
            addedDate: Date.now(),
        });

        it('should add custom emoji', () => {
            const emoji = createCustomEmoji('custom_logo', ['logo', 'brand']);

            manager.addCustomEmoji(emoji);

            const found = manager.findByShortcode('custom_logo');
            expect(found).toBeDefined();
            expect(found?.type).toBe('custom');
        });

        it('should find custom emoji by alias', () => {
            const emoji = createCustomEmoji('custom_logo', ['logo', 'brand']);
            manager.addCustomEmoji(emoji);

            const byAlias1 = manager.findByShortcode('logo');
            const byAlias2 = manager.findByShortcode('brand');

            expect(byAlias1).toBeDefined();
            expect(byAlias2).toBeDefined();
            expect(byAlias1?.shortcode).toBe('custom_logo');
            expect(byAlias2?.shortcode).toBe('custom_logo');
        });

        it('should remove custom emoji and its aliases', () => {
            const emoji = createCustomEmoji('custom_logo', ['logo']);
            manager.addCustomEmoji(emoji);

            manager.removeCustomEmoji('custom_logo');

            expect(manager.findByShortcode('custom_logo')).toBeNull();
            expect(manager.findByShortcode('logo')).toBeNull();
        });

        it('should update custom emoji aliases', () => {
            const emoji = createCustomEmoji('custom_logo', ['logo']);
            manager.addCustomEmoji(emoji);

            manager.updateCustomEmoji('custom_logo', {
                aliases: ['brand', 'company'],
            });

            // Old alias should no longer work
            expect(manager.findByShortcode('logo')).toBeNull();

            // New aliases should work
            expect(manager.findByShortcode('brand')).toBeDefined();
            expect(manager.findByShortcode('company')).toBeDefined();
        });

        it('should get all custom emoji', () => {
            manager.addCustomEmoji(createCustomEmoji('emoji1'));
            manager.addCustomEmoji(createCustomEmoji('emoji2'));

            const customs = manager.getCustomEmojis();
            expect(customs).toHaveLength(2);
        });
    });

    describe('findByShortcode', () => {
        it('should return null for non-existent shortcode', async () => {
            await manager.loadUnicodeEmojis();

            const emoji = manager.findByShortcode('nonexistent_emoji_xyz');
            expect(emoji).toBeNull();
        });

        it('should prioritize custom emoji over Unicode', async () => {
            await manager.loadUnicodeEmojis();

            // Add custom emoji with same shortcode as Unicode emoji
            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'smile',
                filename: 'smile.png',
                filepath: '.obsidian/emoji/smile.png',
                data: 'data:image/png;base64,custom',
                aliases: [],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const found = manager.findByShortcode('smile');
            expect(found?.type).toBe('custom');
        });
    });

    describe('searchEmojis', () => {
        beforeEach(async () => {
            await manager.loadUnicodeEmojis();
        });

        it('should find emoji by partial shortcode match', () => {
            const results = manager.searchEmojis('smile');

            expect(results.length).toBeGreaterThan(0);
            const hasMatch = results.some((e) => e.shortcode.includes('smile'));
            expect(hasMatch).toBe(true);
        });

        it('should find emoji by alias match', () => {
            const results = manager.searchEmojis('+1');

            expect(results.length).toBeGreaterThan(0);
            // Should find thumbsup via its +1 alias (may have variation selector)
            const thumbsup = results.find((e) => e.unicode.includes('👍'));
            expect(thumbsup).toBeDefined();
        });

        it('should respect the limit parameter', () => {
            const results = manager.searchEmojis('a', 5);

            expect(results.length).toBeLessThanOrEqual(5);
        });

        it('should be case insensitive', () => {
            const lower = manager.searchEmojis('smile');
            const upper = manager.searchEmojis('SMILE');

            expect(lower.length).toBeGreaterThan(0);
            expect(upper.length).toBeGreaterThan(0);
        });

        it('should search custom emoji', () => {
            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'company_logo',
                filename: 'logo.png',
                filepath: '.obsidian/emoji/logo.png',
                data: 'data:image/png;base64,fake',
                aliases: ['logo', 'brand'],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const results = manager.searchEmojis('company');
            const found = results.find((e) => e.shortcode === 'company_logo');
            expect(found).toBeDefined();
        });

        it('should find custom emoji by alias', () => {
            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'company_logo',
                filename: 'logo.png',
                filepath: '.obsidian/emoji/logo.png',
                data: 'data:image/png;base64,fake',
                aliases: ['logo', 'brand'],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const results = manager.searchEmojis('brand');
            const found = results.find((e) => e.shortcode === 'company_logo');
            expect(found).toBeDefined();
        });
    });

    describe('getAllEmojis', () => {
        it('should return all emoji', async () => {
            await manager.loadUnicodeEmojis();

            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'test',
                filename: 'test.png',
                filepath: '.obsidian/emoji/test.png',
                data: 'data:image/png;base64,fake',
                aliases: [],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const all = manager.getAllEmojis();
            expect(all.length).toBeGreaterThan(1);

            const hasCustom = all.some((e) => e.type === 'custom');
            const hasUnicode = all.some((e) => e.type === 'unicode');
            expect(hasCustom).toBe(true);
            expect(hasUnicode).toBe(true);
        });
    });

    describe('getStats', () => {
        it('should return accurate statistics', async () => {
            await manager.loadUnicodeEmojis();

            const custom: CustomEmoji = {
                type: 'custom',
                shortcode: 'test',
                filename: 'test.png',
                filepath: '.obsidian/emoji/test.png',
                data: 'data:image/png;base64,fake',
                aliases: ['alias1', 'alias2'],
                addedDate: Date.now(),
            };
            manager.addCustomEmoji(custom);

            const stats = manager.getStats();
            expect(stats.unicode).toBeGreaterThan(0);
            expect(stats.custom).toBe(1);
            expect(stats.totalAliases).toBeGreaterThan(2); // At least our 2 + Unicode aliases
        });
    });

    describe('clear', () => {
        it('should clear all emoji', async () => {
            await manager.loadUnicodeEmojis();

            manager.clear();

            const stats = manager.getStats();
            expect(stats.unicode).toBe(0);
            expect(stats.custom).toBe(0);
            expect(stats.totalAliases).toBe(0);
        });
    });
});
