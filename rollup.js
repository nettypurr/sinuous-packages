import typescript from '@rollup/plugin-typescript';
import bundleSize from 'rollup-plugin-size';
import { terser } from 'rollup-plugin-terser';

const bundleInputs = [
  'sinuous-trace',
  'sinuous-trace/log',
  'sinuous-lifecycle',
  'sinuous-lifecycle/log',
];

/** @type {ModuleFormat[]} */
const bundleFormats = ['esm', 'iife'];

/**
 * Generate a full self contained bundle config from a single-format config
 * @type {(input: string, format: ModuleFormat) => RollupOptions}
 */
const hydrateBundleSnippet = (input, format) => {
  const name = format === 'iife'
    ? input.replace(/(?:-|\/)([a-z])/g, (_, char) => char.toUpperCase())
    : undefined;

  return {
    input: `${input}/index.ts`,
    external: ['sinuous-trace', 'sinuous-lifecycle'],
    plugins: [
      typescript(),
      // nodeResolve(),
      // babel({
      //   babelHelpers: 'bundled',
      //   plugins: ['@babel/plugin-transform-typescript'],
      //   extensions: ['.js', '.ts'],
      // }),
    ],
    output: {
      file: `dist/${format}/${input}.js`,
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
      strict:   false, // Remove `use strict;`
      interop:  false, // Remove `r=r&&r.hasOwnProperty("default")?r.default:r;`
      esModule: false, // Remove `esModule` property
    },
    watch: {
      clearScreen: false,
    },
    onwarn(warning) {
      const skip = [
        // Rollup correctly guesses the global name to be the `name` field
        'MISSING_GLOBAL_NAME',
        // All packages are external dependencies (in this case)
        'UNRESOLVED_IMPORT',
      ];
      if (skip.includes(warning.code)) return;
      console.error(warning.code, warning.message);
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
