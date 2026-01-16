import type { Vault, TFile, TAbstractFile, EventRef } from 'obsidian';
import type { CustomEmoji } from './types/emoji';
import type { EmojiManager } from './emoji-manager';

/**
 * Watches the custom emoji folder for changes and updates the EmojiManager
 */
export class CustomEmojiWatcher {
    private folderPath: string;
    private vault: Vault;
    private emojiManager: EmojiManager;
    private imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    private eventRefs: EventRef[] = [];

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

        // Register vault event handlers
        this.eventRefs.push(
            this.vault.on('create', (file) => {
                if (this.isTFile(file)) {
                    void this.onFileCreated(file);
                }
            })
        );
        this.eventRefs.push(
            this.vault.on('delete', (file) => {
                if (this.isTFile(file)) {
                    this.onFileDeleted(file);
                }
            })
        );
        this.eventRefs.push(
            this.vault.on('rename', (file, oldPath) => {
                if (this.isTFile(file)) {
                    void this.onFileRenamed(file, oldPath);
                }
            })
        );
        this.eventRefs.push(
            this.vault.on('modify', (file) => {
                if (this.isTFile(file)) {
                    void this.onFileModified(file);
                }
            })
        );
    }

    /**
     * Stop watching the folder
     */
    stop(): void {
        // Unregister all event handlers
        for (const eventRef of this.eventRefs) {
            this.vault.offref(eventRef);
        }
        this.eventRefs = [];
    }

    /**
     * Type guard to check if an abstract file is a TFile
     */
    private isTFile(file: TAbstractFile): file is TFile {
        return 'extension' in file && 'stat' in file;
    }

    /**
     * Load all existing emoji from the folder
     */
    private async loadExistingEmoji(): Promise<void> {
        const files = this.vault.getFiles().filter((file) => this.isEmojiFile(file));

        for (const file of files) {
            await this.addEmojiFromFile(file);
        }
    }

    /**
     * Check if a file is an emoji image in the watched folder
     */
    private isEmojiFile(file: TFile): boolean {
        if (!file.path.startsWith(this.folderPath)) return false;

        const ext = file.extension.toLowerCase();
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
     * Add emoji from a file
     */
    private async addEmojiFromFile(file: TFile): Promise<void> {
        try {
            // Read the file as base64 data URL
            const arrayBuffer = await this.vault.readBinary(file);
            const blob = new Blob([arrayBuffer]);
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
    private async onFileCreated(file: TFile): Promise<void> {
        if (this.isEmojiFile(file)) {
            await this.addEmojiFromFile(file);
        }
    }

    /**
     * Handle file deletion
     */
    private onFileDeleted(file: TFile): void {
        if (this.isEmojiFile(file)) {
            const shortcode = this.filenameToShortcode(file.name);
            this.emojiManager.removeCustomEmoji(shortcode);
        }
    }

    /**
     * Handle file rename
     */
    private async onFileRenamed(file: TFile, oldPath: string): Promise<void> {
        const wasEmojiFile = oldPath.startsWith(this.folderPath);
        const isEmojiFile = this.isEmojiFile(file);

        if (wasEmojiFile && !isEmojiFile) {
            // File moved out of emoji folder
            const oldFilename = oldPath.split('/').pop() ?? '';
            const oldShortcode = this.filenameToShortcode(oldFilename);
            this.emojiManager.removeCustomEmoji(oldShortcode);
        } else if (!wasEmojiFile && isEmojiFile) {
            // File moved into emoji folder
            await this.addEmojiFromFile(file);
        } else if (wasEmojiFile && isEmojiFile) {
            // Renamed within emoji folder
            const oldFilename = oldPath.split('/').pop() ?? '';
            const oldShortcode = this.filenameToShortcode(oldFilename);
            this.emojiManager.removeCustomEmoji(oldShortcode);
            await this.addEmojiFromFile(file);
        }
    }

    /**
     * Handle file modification (reload the emoji)
     */
    private async onFileModified(file: TFile): Promise<void> {
        if (this.isEmojiFile(file)) {
            // Reload the emoji with updated data
            const shortcode = this.filenameToShortcode(file.name);
            this.emojiManager.removeCustomEmoji(shortcode);
            await this.addEmojiFromFile(file);
        }
    }
}
