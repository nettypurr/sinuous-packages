# Sinuous onAttach/onDetach DOM lifecycles

![badge:min+gzip](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/index.js?compression=gzip&label=min%2Bgzip&style=flat-square)
![badge:min](https://img.badgesize.io/https://unpkg.com/sinuous-lifecycle/index.js?label=min&style=flat-square)
![badge:npm-v](https://flat.badgen.net/npm/v/sinuous-lifecycle)
![badge:npm-license](https://flat.badgen.net/npm/license/sinuous-lifecycle)
![badge:npm-types](https://flat.badgen.net/npm/types/sinuous-lifecycle)

Write lifecycles in [Sinuous][1]:

```tsx
import { h, observable } from 'sinuous';
import { hooks } from '../hooks.js'; // Explained below

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

## Setup

You extend the Sinuous API yourself when initializing your application. This is
explained in the Sinuous [internal API documentation][7].

Here's how to setup Sinuous for tracing and lifecycles. Run this before using
any Sinuous calls:

```ts
import { api } from 'sinuous'; // 'sinuous/h' if using JSX
import { trace } from 'sinuous-trace';
import { lifecyclePlugin } from 'sinuous-lifecycle';

const tracers = trace.setup(api);
// This wires up onAttach/onDetach to run automatically
lifecyclePlugin(api, tracers);

// Export lifecycle setters however you like
// Alternatively write directly to the Sinuous API as `api.hooks = {...}`
export const hooks = {
  onAttach(callback: () => void): void {
    lifecyclePlugin.setLifecycle('onAttach', callback);
  },
  onDetach(callback: () => void): void {
    lifecyclePlugin.setLifecycle('onDetach', callback);
  },
  // Any of your custom lifecycles...
};
```

Note that only onAttach/onDetach run automatically - any custom lifecycles will
have to have `lifecyclePlugin.callTree()` called as needed. If you write in
Typescript, use declaration merging (module augmentation) to extend the module's
`Lifecycle` interface.

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
lifecyclePlugin.callTree('onAttach', renderedApp);
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
// ... All imports previously used
import { logTrace } from 'sinuous-trace/log';
import { logLifecycle } from 'sinuous-lifecycle/log';

const tracers = trace.setup(api);
lifecyclePlugin(api, tracers);

// Add these lines
logTrace(api, tracers);
logLifecycle(lifecyclePlugin);
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
