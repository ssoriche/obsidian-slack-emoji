import type { UnicodeEmoji } from '../types/emoji';

/**
 * Loads and transforms Emojibase data into our emoji format
 */
export class EmojiLoader {
    private cache: UnicodeEmoji[] | null = null;

    /**
     * Load Unicode emoji from Emojibase
     * Results are cached for performance
     */
    async loadEmojis(): Promise<UnicodeEmoji[]> {
        if (this.cache) {
            return this.cache;
        }

        try {
            // Import Emojibase compact data and GitHub shortcodes
            const emojiData = await import('emojibase-data/en/compact.json');
            const shortcodeData = await import('emojibase-data/en/shortcodes/github.json');

            // Transform to our format
            this.cache = emojiData.default.map((emoji: any) => {
                const hexcode = emoji.hexcode;
                let shortcodes = shortcodeData.default[hexcode] || [];

                // Normalize to array (Emojibase uses string for single shortcode, array for multiple)
                if (typeof shortcodes === 'string') {
                    shortcodes = [shortcodes];
                }

                const [canonical, ...aliases] = shortcodes;

                return {
                    type: 'unicode' as const,
                    unicode: emoji.unicode,
                    hexcode: hexcode,
                    label: emoji.label || emoji.unicode,
                    shortcode: canonical || hexcode,
                    aliases: aliases,
                    category: this.mapGroup(emoji.group),
                };
            });

            return this.cache;
        } catch (error) {
            console.error('Failed to load emoji data:', error);
            throw new Error('Failed to load emoji data');
        }
    }

    /**
     * Map Emojibase group numbers to category names
     */
    private mapGroup(group: number): string {
        const groups: Record<number, string> = {
            0: 'smileys-emotion',
            1: 'people-body',
            2: 'component',
            3: 'animals-nature',
            4: 'food-drink',
            5: 'travel-places',
            6: 'activities',
            7: 'objects',
            8: 'symbols',
            9: 'flags',
        };
        return groups[group] || 'other';
    }

    /**
     * Clear the cache (useful for testing)
     */
    clearCache(): void {
        this.cache = null;
    }
}
