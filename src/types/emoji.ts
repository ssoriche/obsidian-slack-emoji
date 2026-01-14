/**
 * Type definitions for emoji system
 */

/**
 * Base interface for all emoji types
 */
export interface BaseEmoji {
    /**
     * Canonical shortcode (primary identifier)
     * Example: "thumbsup", "custom_logo"
     */
    shortcode: string;

    /**
     * Alternative shortcodes that resolve to this emoji
     * Example: ["+1", "thumbup"] for thumbsup emoji
     */
    aliases: string[];

    /**
     * Category for organization (e.g., "people", "nature")
     * Optional for custom emoji
     */
    category?: string;
}

/**
 * Unicode emoji from Emojibase
 */
export interface UnicodeEmoji extends BaseEmoji {
    type: 'unicode';

    /**
     * Native Unicode character
     * Example: "👍"
     */
    unicode: string;

    /**
     * Display name for the emoji
     * Example: "Thumbs Up"
     */
    label: string;

    /**
     * Hexadecimal codepoint
     * Example: "1F44D"
     */
    hexcode: string;
}

/**
 * Custom user-uploaded emoji
 */
export interface CustomEmoji extends BaseEmoji {
    type: 'custom';

    /**
     * Original filename
     * Example: "logo.png"
     */
    filename: string;

    /**
     * Vault-relative file path
     * Example: ".obsidian/emoji/logo.png"
     */
    filepath: string;

    /**
     * Base64 data URL for rendering
     * Cached in memory for performance
     */
    data: string;

    /**
     * Timestamp when emoji was added
     */
    addedDate: number;
}

/**
 * Union type for all emoji
 */
export type Emoji = UnicodeEmoji | CustomEmoji;

/**
 * Metadata for custom emoji (stored in data.json)
 * Excludes large data URL to reduce file size
 */
export interface CustomEmojiMetadata {
    shortcode: string;
    filename: string;
    aliases: string[];
    addedDate: number;
}

/**
 * Plugin settings interface
 */
export interface EmojiSettings {
    /**
     * Folder path for custom emoji (vault-relative)
     * Default: ".obsidian/emoji"
     */
    customEmojiFolder: string;

    /**
     * Enable Unicode emoji from Emojibase
     * Default: true
     */
    enableUnicodeEmoji: boolean;

    /**
     * Enable custom emoji
     * Default: true
     */
    enableCustomEmoji: boolean;

    /**
     * Enable autocomplete suggester
     * Default: true
     */
    enableAutocomplete: boolean;

    /**
     * Minimum characters before showing autocomplete
     * Default: 2
     */
    autocompleteMinChars: number;

    /**
     * Stored custom emoji metadata
     */
    customEmojis: CustomEmojiMetadata[];
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: EmojiSettings = {
    customEmojiFolder: '.obsidian/emoji',
    enableUnicodeEmoji: true,
    enableCustomEmoji: true,
    enableAutocomplete: true,
    autocompleteMinChars: 2,
    customEmojis: [],
};
