import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [sveltekit(
        {
            onwarn(warning, defaultHandler) {
                // don't warn on <marquee> elements, cos they're cool
                if (warning.code === 'unused-export-let') return;

                // handle all other warnings normally
                defaultHandler(warning);
            }
        }

    )],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
});
