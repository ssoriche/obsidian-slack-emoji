import type { EmojiSettings } from './types/emoji';
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
