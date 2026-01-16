import { ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view';
import type { EmojiManager } from '../emoji-manager';
import { EmojiDecorator } from './emoji-decorator';

/**
 * CodeMirror 6 ViewPlugin that renders emoji in the editor
 */
class EmojiEditorPlugin {
    decorations: DecorationSet;
    private decorator: EmojiDecorator;

    constructor(view: EditorView, private emojiManager: EmojiManager) {
        this.decorator = new EmojiDecorator(emojiManager);
        this.decorations = this.decorator.buildDecorations(view);
    }

    /**
     * Update decorations when the view updates
     */
    update(update: ViewUpdate): void {
        // Rebuild decorations if document changed or viewport changed
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.decorator.buildDecorations(update.view);
        }
    }

    /**
     * Clean up when the plugin is destroyed
     */
    destroy(): void {
        // Nothing to clean up for now
    }
}

/**
 * Create the ViewPlugin instance
 */
export function createEmojiEditorPlugin(emojiManager: EmojiManager) {
    return ViewPlugin.fromClass(
        class extends EmojiEditorPlugin {
            constructor(view: EditorView) {
                super(view, emojiManager);
            }
        },
        {
            decorations: (plugin) => plugin.decorations,
        }
    );
}
