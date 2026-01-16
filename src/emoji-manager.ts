import type { Emoji, UnicodeEmoji, CustomEmoji } from './types/emoji';
import { EmojiLoader } from './data/emoji-loader';

/**
 * Central registry for all emoji (Unicode and custom)
 * Provides fast lookup by shortcode with alias resolution
 */
export class EmojiManager {
    private unicodeEmojis = new Map<string, UnicodeEmoji>();
    private customEmojis = new Map<string, CustomEmoji>();
    private aliasIndex = new Map<string, string>(); // alias -> canonical shortcode
    private loader: EmojiLoader;

    constructor() {
        this.loader = new EmojiLoader();
    }

    /**
     * Load Unicode emoji from Emojibase
     */
    async loadUnicodeEmojis(): Promise<void> {
        const emojis = await this.loader.loadEmojis();

        this.unicodeEmojis.clear();

        for (const emoji of emojis) {
            // Store by canonical shortcode
            this.unicodeEmojis.set(emoji.shortcode, emoji);

            // Index all aliases
            for (const alias of emoji.aliases) {
                this.aliasIndex.set(alias, emoji.shortcode);
            }
        }

        console.log(
            `Loaded ${String(this.unicodeEmojis.size)} Unicode emoji with ${String(this.aliasIndex.size)} aliases`
        );
    }

    /**
     * Add a custom emoji
     */
    addCustomEmoji(emoji: CustomEmoji): void {
        this.customEmojis.set(emoji.shortcode, emoji);

        // Index aliases for custom emoji
        for (const alias of emoji.aliases) {
            this.aliasIndex.set(alias, emoji.shortcode);
        }
    }

    /**
     * Remove a custom emoji by shortcode
     */
    removeCustomEmoji(shortcode: string): void {
        const emoji = this.customEmojis.get(shortcode);
        if (!emoji) return;

        // Remove aliases from index
        for (const alias of emoji.aliases) {
            this.aliasIndex.delete(alias);
        }

        this.customEmojis.delete(shortcode);
    }

    /**
     * Update a custom emoji
     */
    updateCustomEmoji(shortcode: string, updates: Partial<CustomEmoji>): void {
        const existing = this.customEmojis.get(shortcode);
        if (!existing) return;

        // Remove old aliases
        for (const alias of existing.aliases) {
            this.aliasIndex.delete(alias);
        }

        // Apply updates
        const updated = { ...existing, ...updates };
        this.customEmojis.set(shortcode, updated);

        // Re-index new aliases
        for (const alias of updated.aliases) {
            this.aliasIndex.set(alias, shortcode);
        }
    }

    /**
     * Find emoji by shortcode (canonical or alias)
     * This is the main lookup method - handles alias resolution transparently
     */
    findByShortcode(shortcode: string): Emoji | null {
        // First check if it's a canonical shortcode in custom emoji
        const customEmoji = this.customEmojis.get(shortcode);
        if (customEmoji) return customEmoji;

        // Then check Unicode emoji
        const unicodeEmoji = this.unicodeEmojis.get(shortcode);
        if (unicodeEmoji) return unicodeEmoji;

        // Check if it's an alias
        const canonical = this.aliasIndex.get(shortcode);
        if (canonical) {
            return this.customEmojis.get(canonical) ?? this.unicodeEmojis.get(canonical) ?? null;
        }

        return null;
    }

    /**
     * Search emoji by query (matches shortcode, aliases, or label)
     * Used for autocomplete
     */
    searchEmojis(query: string, limit = 50): Emoji[] {
        const lowerQuery = query.toLowerCase();
        const results: Emoji[] = [];

        // Search Unicode emoji
        for (const emoji of this.unicodeEmojis.values()) {
            if (results.length >= limit) break;

            if (
                emoji.shortcode.includes(lowerQuery) ||
                emoji.aliases.some((a) => a.includes(lowerQuery)) ||
                emoji.label.toLowerCase().includes(lowerQuery)
            ) {
                results.push(emoji);
            }
        }

        // Search custom emoji
        for (const emoji of this.customEmojis.values()) {
            if (results.length >= limit) break;

            if (
                emoji.shortcode.includes(lowerQuery) ||
                emoji.aliases.some((a) => a.includes(lowerQuery))
            ) {
                results.push(emoji);
            }
        }

        return results;
    }

    /**
     * Get all emoji (custom + Unicode)
     */
    getAllEmojis(): Emoji[] {
        return [...this.customEmojis.values(), ...this.unicodeEmojis.values()];
    }

    /**
     * Get only custom emoji
     */
    getCustomEmojis(): CustomEmoji[] {
        return [...this.customEmojis.values()];
    }

    /**
     * Get only Unicode emoji
     */
    getUnicodeEmojis(): UnicodeEmoji[] {
        return [...this.unicodeEmojis.values()];
    }

    /**
     * Get statistics
     */
    getStats(): {
        unicode: number;
        custom: number;
        totalAliases: number;
    } {
        return {
            unicode: this.unicodeEmojis.size,
            custom: this.customEmojis.size,
            totalAliases: this.aliasIndex.size,
        };
    }

    /**
     * Clear all emoji (useful for testing)
     */
    clear(): void {
        this.unicodeEmojis.clear();
        this.customEmojis.clear();
        this.aliasIndex.clear();
    }
}
