import { describe, it, expect, beforeEach } from 'vitest';
import { EmojiLoader } from './emoji-loader';

describe('EmojiLoader', () => {
    let loader: EmojiLoader;

    beforeEach(() => {
        loader = new EmojiLoader();
    });

    describe('loadEmojis', () => {
        it('should load emoji data successfully', async () => {
            const emojis = await loader.loadEmojis();

            expect(emojis).toBeDefined();
            expect(Array.isArray(emojis)).toBe(true);
            expect(emojis.length).toBeGreaterThan(0);
        });

        it('should return cached data on subsequent calls', async () => {
            const first = await loader.loadEmojis();
            const second = await loader.loadEmojis();

            expect(first).toBe(second); // Same reference = cached
        });

        it('should include required fields for each emoji', async () => {
            const emojis = await loader.loadEmojis();
            const sample = emojis[0];

            expect(sample).toHaveProperty('type', 'unicode');
            expect(sample).toHaveProperty('unicode');
            expect(sample).toHaveProperty('hexcode');
            expect(sample).toHaveProperty('label');
            expect(sample).toHaveProperty('shortcode');
            expect(sample).toHaveProperty('aliases');
            expect(sample).toHaveProperty('category');

            expect(typeof sample.unicode).toBe('string');
            expect(typeof sample.hexcode).toBe('string');
            expect(typeof sample.label).toBe('string');
            expect(typeof sample.shortcode).toBe('string');
            expect(Array.isArray(sample.aliases)).toBe(true);
        });

        it('should include thumbsup emoji with aliases', async () => {
            const emojis = await loader.loadEmojis();
            const thumbsup = emojis.find(
                (e) => e.shortcode === 'thumbsup' || e.aliases.includes('thumbsup')
            );

            expect(thumbsup).toBeDefined();
            // Unicode may include variation selectors
            expect(thumbsup?.unicode).toContain('👍');
            // Should have +1 or thumbup as alias
            const hasCommonAlias =
                thumbsup?.aliases.includes('+1') || thumbsup?.aliases.includes('thumbup');
            expect(hasCommonAlias).toBe(true);
        });

        it('should map emoji to categories', async () => {
            const emojis = await loader.loadEmojis();

            // Check that we have emojis in different categories
            const categories = new Set(emojis.map((e) => e.category));

            expect(categories.size).toBeGreaterThan(1);
            expect(categories.has('smileys-emotion')).toBe(true);
            expect(categories.has('people-body')).toBe(true);
        });

        it('should handle emojis with no shortcodes by using hexcode', async () => {
            const emojis = await loader.loadEmojis();

            // Every emoji should have a shortcode (either from data or hexcode fallback)
            const allHaveShortcodes = emojis.every((e) => e.shortcode && e.shortcode.length > 0);

            expect(allHaveShortcodes).toBe(true);
        });
    });

    describe('clearCache', () => {
        it('should clear the cache and reload on next call', async () => {
            const first = await loader.loadEmojis();

            loader.clearCache();

            const second = await loader.loadEmojis();

            expect(first).not.toBe(second); // Different references = reloaded
            expect(first).toEqual(second); // But same content
        });
    });
});
