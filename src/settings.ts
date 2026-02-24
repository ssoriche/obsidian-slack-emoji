import type { EmojiSettings, CustomEmoji, CustomEmojiMetadata } from './types/emoji';
import { DEFAULT_SETTINGS } from './types/emoji';

/**
 * Validates and merges loaded settings with defaults
 */
export function validateSettings(loaded: Partial<EmojiSettings>): EmojiSettings {
    return {
        ...DEFAULT_SETTINGS,
        ...loaded,
        // Ensure required fields
        customEmojis: loaded.customEmojis ?? DEFAULT_SETTINGS.customEmojis,
    };
}

/**
 * Find custom emoji loaded from disk that are missing metadata in settings.
 * Returns new CustomEmojiMetadata entries for untracked emoji.
 */
export function findMissingMetadata(
    loadedEmojis: CustomEmoji[],
    existingMetadata: CustomEmojiMetadata[]
): CustomEmojiMetadata[] {
    const tracked = new Set(existingMetadata.map((m) => m.shortcode));
    return loadedEmojis
        .filter((e) => !tracked.has(e.shortcode))
        .map((e) => ({
            shortcode: e.shortcode,
            filename: e.filename,
            aliases: e.aliases,
            addedDate: e.addedDate,
        }));
}
