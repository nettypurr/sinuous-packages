import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import bundleSize from 'rollup-plugin-size';
import { terser } from 'rollup-plugin-terser';

const bundleInputs = [
  'sinuous-trace',
  'sinuous-trace/log',
  'sinuous-lifecycle',
  'sinuous-lifecycle/log',
  'sinuous-tree',
];

/** @type {ModuleFormat[]} */
const bundleFormats = ['esm', 'iife'];

/**
 * Generate a full self contained bundle config from a single-format config
 * @type {(input: string, format: ModuleFormat) => RollupOptions}
 */
const hydrateBundleSnippet = (input, format) => {
  const name
    = format === 'iife'
      ? input.replace(/(?:-|\/)([a-z])/g, (_, char) => char.toUpperCase())
      : undefined;

  const extension
    = format === 'iife'
      ? 'min.js'
      : 'js';

  return {
    input: `${input}/index.ts`,
    external: ['sinuous', 'sinuous-trace', 'sinuous-lifecycle'],
    plugins: [
      resolve({
        extensions: ['.js', '.ts'],
      }),
      babel({
        babelHelpers: 'bundled',
        plugins: ['@babel/plugin-transform-typescript'],
        extensions: ['.js', '.ts'],
      }),
    ],
    output: {
      file: `${input}/index.${extension}`,
      format,
      name,
      sourcemap: true,
      plugins: [
        bundleSize({
          // Unfortunately this package wasn't properly typed or documented, see
          // package `size-plugin-core` for all available options
          // @ts-ignore
          decorateItem: (item) =>
            item.replace(/.+\.js/, `${input.padStart(30)} - ${format.toUpperCase().padEnd(4)}`),
        }),
        terser({
          ecma: 2017,
          warnings: true,
          compress: {
            passes: 2,
          },
          mangle: {},
        }),
      ],
      strict: false, // Remove `use strict;`
    },
    watch: {
      clearScreen: false,
    },
  };
};

const bundles = [];
for (const input of bundleInputs) {
  for (const format of bundleFormats) {
    bundles.push(hydrateBundleSnippet(input, format));
  }
}

export default bundles;

/**
 * @typedef {import("rollup").ModuleFormat} ModuleFormat
 * @typedef {import("rollup").InputOptions} InputOptions
 * @typedef {import("rollup").OutputOptions} OutputOptions
 * @typedef {InputOptions & { output: OutputOptions }} RollupOptions
 */
