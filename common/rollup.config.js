import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
    input: 'index.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: 'inline'
    },

    plugins: [
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
