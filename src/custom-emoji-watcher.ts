import type { Vault, TFile, TAbstractFile, EventRef } from 'obsidian';
import type { CustomEmoji } from './types/emoji';
import type { EmojiManager } from './emoji-manager';

/**
 * Watches the custom emoji folder for changes and updates the EmojiManager
 */
// Vault events do not fire for files in hidden folders like .obsidian/emoji/ when
// they are added externally. Poll the folder periodically as a reliable fallback.
const POLL_INTERVAL_MS = 5000;

export class CustomEmojiWatcher {
    private folderPath: string;
    private vault: Vault;
    private emojiManager: EmojiManager;
    private imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    private eventRefs: EventRef[] = [];
    private pollTimer: number | null = null;

    constructor(vault: Vault, emojiManager: EmojiManager, folderPath: string) {
        this.vault = vault;
        this.emojiManager = emojiManager;
        this.folderPath = folderPath;
    }

    /**
     * Start watching the folder for changes
     */
    async start(): Promise<void> {
        // Load existing emoji from the folder
        await this.loadExistingEmoji();

        // Register vault event handlers.
        // Use path-based detection (isEmojiPath) rather than isTFile so that files in
        // hidden folders like .obsidian/emoji/ are handled even when Obsidian does not
        // index them as TFile objects.
        this.eventRefs.push(
            this.vault.on('create', (file) => {
                void this.onFileCreated(file);
            })
        );
        this.eventRefs.push(
            this.vault.on('delete', (file) => {
                this.onFileDeleted(file);
            })
        );
        this.eventRefs.push(
            this.vault.on('rename', (file, oldPath) => {
                void this.onFileRenamed(file, oldPath);
            })
        );
        this.eventRefs.push(
            this.vault.on('modify', (file) => {
                void this.onFileModified(file);
            })
        );

        // Poll as a fallback: vault events are not emitted for files in hidden folders
        // (.obsidian/) when they are added externally by the user.
        this.pollTimer = window.setInterval(() => {
            void this.pollForNewEmoji();
        }, POLL_INTERVAL_MS);
    }

    /**
     * Stop watching the folder
     */
    stop(): void {
        if (this.pollTimer !== null) {
            window.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        // Unregister all event handlers
        for (const eventRef of this.eventRefs) {
            this.vault.offref(eventRef);
        }
        this.eventRefs = [];
    }

    /**
     * Load all existing emoji from the folder
     */
    private async loadExistingEmoji(): Promise<void> {
        // First try vault.getFiles() for normal folders
        const vaultFiles = this.vault.getFiles().filter((file) => this.isEmojiFile(file));

        if (vaultFiles.length > 0) {
            for (const file of vaultFiles) {
                await this.addEmojiFromFile(file);
            }
            return;
        }

        // Fall back to adapter for hidden folders like .obsidian/
        const folderExists = await this.vault.adapter.exists(this.folderPath);
        if (!folderExists) {
            return;
        }

        const listing = await this.vault.adapter.list(this.folderPath);
        for (const filePath of listing.files) {
            const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
            if (this.imageExtensions.includes(`.${ext}`)) {
                await this.addEmojiFromPath(filePath);
            }
        }
    }

    /**
     * Poll the emoji folder for files that appeared since the last scan.
     * Only reads files whose shortcodes are not yet in the EmojiManager, so repeated
     * calls after the initial load do very little work (one directory listing).
     */
    private async pollForNewEmoji(): Promise<void> {
        const folderExists = await this.vault.adapter.exists(this.folderPath);
        if (!folderExists) return;

        const listing = await this.vault.adapter.list(this.folderPath);
        for (const filePath of listing.files) {
            if (!this.isEmojiPath(filePath)) continue;
            const filename = filePath.split('/').pop() ?? '';
            const shortcode = this.filenameToShortcode(filename);
            if (!this.emojiManager.findByShortcode(shortcode)) {
                await this.addEmojiFromPath(filePath);
            }
        }
    }

    /**
     * Check if a TFile (from vault index) is an emoji image in the watched folder.
     * Used only by loadExistingEmoji which receives TFile objects from vault.getFiles().
     */
    private isEmojiFile(file: TFile): boolean {
        return this.isEmojiPath(file.path);
    }

    /**
     * Check if a path refers to an emoji image in the watched folder.
     * Works for any file regardless of vault indexing (e.g. files in .obsidian/).
     */
    private isEmojiPath(filePath: string): boolean {
        const folderPrefix = this.folderPath.endsWith('/')
            ? this.folderPath
            : this.folderPath + '/';
        if (!filePath.startsWith(folderPrefix)) return false;
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        return this.imageExtensions.includes(`.${ext}`);
    }

    /**
     * Generate a shortcode from a filename
     */
    private filenameToShortcode(filename: string): string {
        // Remove extension
        const name = filename.replace(/\.[^.]+$/, '');
        // Replace spaces and special chars with underscores
        return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    }

    /**
     * Add emoji from a TFile
     */
    private async addEmojiFromFile(file: TFile): Promise<void> {
        try {
            // Read the file as base64 data URL
            const arrayBuffer = await this.vault.readBinary(file);
            const mimeType = this.getMimeType(file.extension);
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const dataUrl = await this.blobToDataUrl(blob);

            const shortcode = this.filenameToShortcode(file.name);

            const emoji: CustomEmoji = {
                type: 'custom',
                shortcode,
                filename: file.name,
                filepath: file.path,
                data: dataUrl,
                aliases: [],
                addedDate: file.stat.ctime,
            };

            this.emojiManager.addCustomEmoji(emoji);
        } catch (error) {
            console.error(`Failed to load emoji from ${file.path}:`, error);
        }
    }

    /**
     * Add emoji from a file path (for hidden folders accessed via adapter)
     */
    private async addEmojiFromPath(filePath: string): Promise<void> {
        try {
            const filename = filePath.split('/').pop() ?? '';
            const ext = filename.split('.').pop() ?? '';

            // Read the file as base64 data URL
            const arrayBuffer = await this.vault.adapter.readBinary(filePath);
            const mimeType = this.getMimeType(ext);
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const dataUrl = await this.blobToDataUrl(blob);

            const shortcode = this.filenameToShortcode(filename);

            const emoji: CustomEmoji = {
                type: 'custom',
                shortcode,
                filename,
                filepath: filePath,
                data: dataUrl,
                aliases: [],
                addedDate: Date.now(),
            };

            this.emojiManager.addCustomEmoji(emoji);
        } catch (error) {
            console.error(`Failed to load emoji from ${filePath}:`, error);
        }
    }

    /**
     * Get MIME type from file extension
     */
    private getMimeType(extension: string): string {
        const mimeTypes: Record<string, string> = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            webp: 'image/webp',
        };
        return mimeTypes[extension.toLowerCase()] ?? 'application/octet-stream';
    }

    /**
     * Convert a blob to a data URL
     */
    private blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Handle file creation
     */
    private async onFileCreated(file: TAbstractFile): Promise<void> {
        if (this.isEmojiPath(file.path)) {
            await this.addEmojiFromPath(file.path);
        }
    }

    /**
     * Handle file deletion
     */
    private onFileDeleted(file: TAbstractFile): void {
        if (this.isEmojiPath(file.path)) {
            const shortcode = this.filenameToShortcode(file.name);
            this.emojiManager.removeCustomEmoji(shortcode);
        }
    }

    /**
     * Handle file rename
     */
    private async onFileRenamed(file: TAbstractFile, oldPath: string): Promise<void> {
        const wasEmoji = this.isEmojiPath(oldPath);
        const isEmoji = this.isEmojiPath(file.path);

        if (wasEmoji && !isEmoji) {
            // File moved out of emoji folder
            const oldFilename = oldPath.split('/').pop() ?? '';
            this.emojiManager.removeCustomEmoji(this.filenameToShortcode(oldFilename));
        } else if (!wasEmoji && isEmoji) {
            // File moved into emoji folder
            await this.addEmojiFromPath(file.path);
        } else if (wasEmoji && isEmoji) {
            // Renamed within emoji folder
            const oldFilename = oldPath.split('/').pop() ?? '';
            this.emojiManager.removeCustomEmoji(this.filenameToShortcode(oldFilename));
            await this.addEmojiFromPath(file.path);
        }
    }

    /**
     * Handle file modification (reload the emoji)
     */
    private async onFileModified(file: TAbstractFile): Promise<void> {
        if (this.isEmojiPath(file.path)) {
            // Reload the emoji with updated data
            const shortcode = this.filenameToShortcode(file.name);
            this.emojiManager.removeCustomEmoji(shortcode);
            await this.addEmojiFromPath(file.path);
        }
    }
}
