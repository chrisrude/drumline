import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
    input: 'index.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: "inline"
    },

    plugins: [
        commonjs(),
        json(),
        nodeResolve(),
        typescript(),
        terser({
            format: {
                comments: 'some',
                beautify: true,
                ecma: '2022'
            },
            compress: false,
            mangle: false,
            module: true
        })
    ]
};
