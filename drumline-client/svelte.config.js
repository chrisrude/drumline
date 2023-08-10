import adapter from '@sveltejs/adapter-static';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    appDir: 'app',
    kit: {
        adapter: adapter({
            // pages: 'build',
            // assets: 'build',
            fallback: '/index.html'
            // precompress: false,
            // strict: true
        })
    },
    preprocess: sveltePreprocess()
};

export default config;
