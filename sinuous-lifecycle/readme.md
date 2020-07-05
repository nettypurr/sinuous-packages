# Sinuous onAttach/onDetach DOM lifecycles

![badge:min+gzip](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/index.js?compression=gzip&label=min%2Bgzip&style=flat-square)
![badge:min](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/index.js?label=min&style=flat-square)
![badge:npm-v](https://flat.badgen.net/npm/v/sinuous-lifecycle)
![badge:npm-license](https://flat.badgen.net/npm/license/sinuous-lifecycle)
![badge:npm-types](https://flat.badgen.net/npm/types/sinuous-lifecycle)

Write lifecycles in [Sinuous][1].

_/components/YourComponent.tsx_:

```tsx
import { h, observable } from 'sinuous';
import { hooks } from '../index.js'; // Optional shorthand notation

const YourComponent = () => {
  const windowSize = observable('');
  const onWindowResize = () =>
    windowSize(`${window.innerWidth}px × ${window.innerHeight}px`);

  hooks.onAttach(() => {
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
  });
  hooks.onDetach(() => {
    window.removeEventListener('resize', onWindowResize);
  });
  return <p>The window's size is <span>{windowSize}</span></p>;
};
```

_/index.tsx_:

```tsx
import { h, api } from 'sinuous';
import { trace } from 'sinuous-trace';
import { lifecycle } from 'sinuous-lifecycle';

trace(api);
lifecycle(api, trace);

const hooks = {
  onAttach(fn: () => void) { lifecycle.set('onAttach', fn); },
  onDetach(fn: () => void) { lifecycle.set('onDetach', fn); },
};

const Page = () =>
  <main>
    <YourComponent/>
  </main>

api.add(document.body, <Page/>);

export { hooks };
```

UI libraries that work with the DOM instead of a virtual DOM often don't have a
centralized render loop to know when a component [`isConnected`][2]. Instead,
often a [`MutationObserver`][3] is used for these events as seen in packages
like [disconnected][4] and [disco][5]; written for hyperHTML and Sinuous,
respectively.

This works, but has very questionable performance and the API isn't personally
as intuitive as say, React's `componentWillMount`. Even without knowing the
browser's implementation, it sounds expensive to ask to observe _all_ `document`
changes. Instead, this package does the bookkeeping necessary to provide
lifecycles without a `MutationObserver`.

In [`sinuous-trace`][6], Sinuous API calls are wrapped to capture component
element creation, adoption, and removal. This is stored in a `WeakMap` tree to
hold all component relations. This means `sinuous-lifecycle` can plug into those
events and check whether the parent/child will change their connection to the
DOM, providing the onAttach/onDetach lifecycles.

## Install

```
npm install sinuous-lifecycle
```

Alternatively, in your HTML:

```html
<!-- ESM -->
<script type="module" src="https://unpkg.com/sinuous-lifecycle?module"></script>
<!-- IIFE (For older browsers) -->
<script src="https://unpkg.com/sinuous-lifecycle/index.min.js"></script>
```

## Setup

You extend the Sinuous API yourself when initializing your application. This is
explained in the Sinuous [internal API documentation][7].

Here's how to setup Sinuous for tracing and lifecycles. Run this before using
any Sinuous calls:

```ts
import { api } from 'sinuous';
import { trace } from 'sinuous-trace';
import { lifecycle } from 'sinuous-lifecycle';

// These functions must be run at initialization before Sinuous is called
trace(api);
// This wires up onAttach/onDetach to run automatically
lifecycle(api, trace);

// Optional: Export lifecycle setters however you like
// Alternatively write directly to the Sinuous API as `api.hooks = {...}`
const hooks = {
  onAttach(fn: () => void) { lifecycle.setLifecycle('onAttach', fn); },
  onDetach(fn: () => void) { lifecycle.setLifecycle('onDetach', fn); },
  // Any of your custom lifecycles...
};
```

Note that only onAttach/onDetach run automatically - any custom lifecycles will
need `lifecycle.callTree()` to run. If you write in Typescript, use declaration
merging (module augmentation) to extend the module's `Lifecycle` interface.

### Hot Module Reloading

If you're using HMR you must be sure to only run `trace` and `lifecycle` once,
or you'll receive _"Too much recursion"_ or _"Maximum call stack size exceeded"_
because the function will call itself instead of Sinuous' API.

```ts
// In using Parcel/Webpack HMR (or a CodeSandbox)
if (!window.sinuousSetup) {
  window.sinuousSetup = true;
  trace(api);
  lifecycle(api, trace);
}
```

Just mark that you've done the operation so it's not done again. I use `window`
as an example but it doesn't matter where you store the marker as long as it's
outside of the module to being hot reloaded.

## Limitations

This works through bookkeeping. The internal Sinuous API has its execution
traced to determine what action to take. _This means you have to use Sinuous_.
In `MutationObserver`, you can  run DOM APIs directly (i.e `appendChild()`) or
mix and match libraries like using jQuery now and then.

_This won't work in this library. You must use the Sinuous API_. If you use
Sinuous for all of your UI you'll be fine. If you ever need to use a DOM API for
adding or removing nodes, use `api.add()` or `api.rm()` instead.

For instance, Sinuous documentation uses `document.appendChild()` as an example
of how to attach your root app to the DOM. Doing this won't cause lifecycles to
run. Instead, either:

**Call lifecycle tree manually:**

```tsx
const renderedApp = <App/>
document.appendChild(document.querySelector('#root'), renderedApp)
lifecycle.callTree('onAttach', renderedApp);
```

**Use `api.add()`**

```tsx
api.add(document.querySelector('#root'), <App/>)
```

## Logging / Debugging

![badge:min+gzip](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/log/index.js?compression=gzip&label=min%2Bgzip&style=flat-square)
![badge:min](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/log/index.js?label=min&style=flat-square)

This package includes an optional log package at `sinuous-lifecycle/log`. Here's
an example to setup the browser console logging, extending the above example.

```ts
import { api } from 'sinuous';
import { trace } from 'sinuous-trace';
// Optional: Try `logTrace` from sinuous-trace/log too if you'd like both
import { logLifecycle } from 'sinuous-lifecycle/log';

trace(api);
lifecycle(api, trace);
// logTrace(...)
logLifecycle(trace, lifecycle /*, options: LogLifecycleOptions */);
```

> If using HMR you have to make sure this only runs once. This is documented in
> above in the setup section.

Options: (Defaults shown)

```ts
const options: LogLifecycleOptions = {
  consoleStyle: {
    onAttach: 'background: #A6E2B3', // Green
    onDetach: 'background: #F4A89A', // Red
  },
};
```

There's a notable performance hit when the browser console is open, but does
show all lifecycle calls including the root tree element and the total call
count.

[1]: https://sinuous.dev
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Node/isConnected
[3]: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
[4]: https://github.com/WebReflection/disconnected
[5]: https://github.com/luwes/disco
[6]: https://gitlab.com/nthm/sinuous-packages/-/tree/work/sinuous-trace
[7]: https://github.com/luwes/sinuous#internal-api
