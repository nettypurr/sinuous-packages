# Sinuous Trace/Lifecycle/Tree

This is a monorepo for packages [`sinuous-trace`][1], [`sinuous-lifecycle`][2],
and `sinuous-tree` (not yet implemented). They record component relationships
and provide DOM lifecycles to Sinuous. Visit the individual packages readme
files for documentation.

All packages are written in strict Typescript and have full type support. I
compile bundles as ESM and IIFE.

Install:

```
npm install sinuous-trace sinuous-lifecycle
```

Directly in your HTML:

```html
<!-- ESM -->
<script type="module" src="https://unpkg.com/sinuous-trace/index.js"></script>
<script type="module" src="https://unpkg.com/sinuous-lifecycle/index.js"></script>

<!-- IIFE (For older browsers) -->
<script src="https://unpkg.com/sinuous-trace/index.min.js"></script>
<script src="https://unpkg.com/sinuous-lifecycle/index.min.js"></script>
```

## Building

Output files are places alongside source files. There's no `dist/` folder.

```
npm run build
npm run clean:all
```

## Feedback

This is the first time I'm publishing packages so any feedback is appreciated.

[1]: https://www.npmjs.com/package/sinuous-trace
[2]: https://www.npmjs.com/package/sinuous-lifecycle
