import { describe, it, expect } from 'vitest';
import { findMissingMetadata, validateSettings } from './settings';
import type { CustomEmoji, CustomEmojiMetadata } from './types/emoji';

const createCustomEmoji = (
    shortcode: string,
    overrides: Partial<CustomEmoji> = {}
): CustomEmoji => ({
    type: 'custom',
    shortcode,
    filename: `${shortcode}.png`,
    filepath: `.obsidian/emoji/${shortcode}.png`,
    data: 'data:image/png;base64,fake',
    aliases: [],
    addedDate: 1000,
    ...overrides,
});

const createMetadata = (
    shortcode: string,
    overrides: Partial<CustomEmojiMetadata> = {}
): CustomEmojiMetadata => ({
    shortcode,
    filename: `${shortcode}.png`,
    aliases: [],
    addedDate: 1000,
    ...overrides,
});

describe('findMissingMetadata', () => {
    it('should return empty array when all emoji are tracked', () => {
        const loaded = [createCustomEmoji('logo'), createCustomEmoji('wave')];
        const existing = [createMetadata('logo'), createMetadata('wave')];

        const result = findMissingMetadata(loaded, existing);

        expect(result).toEqual([]);
    });

    it('should return metadata for emoji missing from settings', () => {
        const loaded = [
            createCustomEmoji('logo'),
            createCustomEmoji('wave', { aliases: ['hi'], addedDate: 2000 }),
        ];
        const existing = [createMetadata('logo')];

        const result = findMissingMetadata(loaded, existing);

        expect(result).toEqual([
            {
                shortcode: 'wave',
                filename: 'wave.png',
                aliases: ['hi'],
                addedDate: 2000,
            },
        ]);
    });

    it('should preserve existing metadata entries unchanged', () => {
        const existing = [createMetadata('logo', { aliases: ['brand', 'company'] })];
        const loaded = [createCustomEmoji('logo')];

        const result = findMissingMetadata(loaded, existing);

        expect(result).toEqual([]);
        // Verify existing was not mutated
        expect(existing[0].aliases).toEqual(['brand', 'company']);
    });

    it('should handle empty loaded emoji list', () => {
        const existing = [createMetadata('logo')];

        const result = findMissingMetadata([], existing);

        expect(result).toEqual([]);
    });

    it('should handle empty existing metadata list', () => {
        const loaded = [createCustomEmoji('logo')];

        const result = findMissingMetadata(loaded, []);

        expect(result).toEqual([
            {
                shortcode: 'logo',
                filename: 'logo.png',
                aliases: [],
                addedDate: 1000,
            },
        ]);
    });

    it('should handle both lists empty', () => {
        const result = findMissingMetadata([], []);

        expect(result).toEqual([]);
    });

    it('should return all loaded emoji when none are tracked', () => {
        const loaded = [createCustomEmoji('logo'), createCustomEmoji('wave')];

        const result = findMissingMetadata(loaded, []);

        expect(result).toHaveLength(2);
        expect(result.map((m) => m.shortcode)).toEqual(['logo', 'wave']);
    });
});

describe('validateSettings', () => {
    it('should return defaults for empty input', () => {
        const settings = validateSettings({});

        expect(settings.customEmojiFolder).toBe('.obsidian/emoji');
        expect(settings.enableUnicodeEmoji).toBe(true);
        expect(settings.enableCustomEmoji).toBe(true);
        expect(settings.customEmojis).toEqual([]);
    });

    it('should merge loaded settings with defaults', () => {
        const settings = validateSettings({
            enableUnicodeEmoji: false,
            customEmojiFolder: 'my-emoji',
        });

        expect(settings.enableUnicodeEmoji).toBe(false);
        expect(settings.customEmojiFolder).toBe('my-emoji');
        expect(settings.enableCustomEmoji).toBe(true);
    });
});
