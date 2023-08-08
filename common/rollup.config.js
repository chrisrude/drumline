import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import path from 'node:path';

export default {
    input: 'index.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: 'inline',
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            // will replace relative paths with absolute paths
            return path.resolve(path.dirname(sourcemapPath), 'lib/' + relativeSourcePath);
        }
    },

    plugins: [
        json(),
        nodeResolve(),
        commonjs({ extensions: ['.js', '.ts'] }), // the ".ts" extension is required
        typescript({ compilerOptions: { module: 'CommonJS', module: 'esnext' } }),
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
