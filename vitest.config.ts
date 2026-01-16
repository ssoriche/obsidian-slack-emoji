import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/main.ts',
                'src/settings-tab.ts',
                'src/editor/emoji-decorator.ts', // Requires CodeMirror integration testing
                'src/editor/emoji-plugin.ts', // Requires CodeMirror integration testing
                'src/editor/emoji-suggester.ts', // EditorSuggest requires Obsidian runtime
                'src/custom-emoji-watcher.ts', // Vault event handlers require Obsidian integration testing
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
    },
});
