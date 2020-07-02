# Recording component relationships in Sinuous

![badge:min+gzip](https://img.badgesize.io/https://unpkg.com/sinuous-trace/index.js?compression=gzip&label=min%2Bgzip&style=flat-square)
![badge:min](https://img.badgesize.io/https://unpkg.com/sinuous-trace/index.js?label=min&style=flat-square)
![badge:npm-v](https://flat.badgen.net/npm/v/sinuous-trace)
![badge:npm-license](https://flat.badgen.net/npm/license/sinuous-trace)
![badge:npm-types](https://flat.badgen.net/npm/types/sinuous-trace)

This library traces the [Sinuous][1] API to record component creation, adoption,
and removal. This forms a component tree stored in a `WeakMap` of all live
components.

## Setup

You extend the Sinuous API yourself when initializing your application. This is
explained in the Sinuous [internal API documentation][2].

```ts
import { api } from 'sinuous'; // 'sinuous/h' if using JSX
import { trace } from 'sinuous-trace';

const tracers = trace.setup(api);
// The `tracers` object is used to extend with plugins like `sinuous-lifecycle`
```

## Uses

You can lookup relationships. You can also store data per component instance and
then refer to it later. Both concepts are used in [`sinuous-lifecycle`][3] to
provide onAttach/onDetach lifecycles to components.

I also personally use it to track what observables a component uses during
server-side rendering - before the payload is sent to the client, I create a
bundle that will hydrate specific DOM nodes with refering to those observables.

Maybe you'll find a usecase too.

## Bookkeeping

This library builds the component tree through bookkeeping (tracing) the
execution. This means if you perform operations on parenting or removing DOM
nodes outside of Sinuous (and its API) you'll be hiding operations.

Use `h()`, `api.add()`, and `api.rm()` instead of more manual ways of handling
components (or using other libraries like jQuery). If you use Sinuous normally
you'll be fine. For instance,

```tsx
const Page = () =>
  <div>
    <p>This is a child that will be added to {'<div>'} via `api.add()`</p>
  </div>

// Later, attach the component to the DOM
api.add(document.body, <Page/>, document.body.firstChild);
```

The above snippet will be fine. However, if you used `document.appendChild()`
instead of `api.add()`, or called the component with `Page()` instead of using
either `<Page/>` or `h(Page)` - You'd be hiding operations from the tree.

## Memory considerations

Because components are stored in a `WeakMap`, they're considered "live" if
anything maintains a reference to the DOM element which prevents the node from
being garbage collected. This library shouldn't have any overhead on the memory
of your application. In fact, it may help you in finding unexpectedly live
components.

Children are stored in a `Set` because `WeakSet` isn't iterable. Note that if
you remove a child without using `api.rm()`, such as by using native DOM APIs,
and that component had a parent, you'll maintain a reference to the element in
the children `Set`.

At the end of the day it's not something you _have_ to think about unless you
have thounsands of components in a complex application - at that point these
types of considerations will have to be made regardless of your UI library,
especially in VDOMs like React.

## Logging / Debugging

![badge:min+gzip](https://img.badgesize.io/https://unpkg.com/sinuous-trace/log/index.js?compression=gzip&label=min%2Bgzip&style=flat-square)
![badge:min](https://img.badgesize.io/https://unpkg.com/sinuous-trace/log/index.js?label=min&style=flat-square)

This package includes an optional log package at `sinuous-trace/log`. It logs
all (seriously, _every_) API call in Sinuous. It's a lot of noise but it shows
you how your application is being executed.

```ts
import { api } from 'sinuous'; // 'sinuous/h' if using JSX
import { trace } from 'sinuous-trace';
import { logTrace } from 'sinuous-trace/log';

const tracers = trace.setup(api);
// Add this
logTrace(api, tracers);
```

There's a notable performance hit when the browser console is open.

[1]: https://sinuous.dev
[2]: https://github.com/luwes/sinuous#internal-api
[3]: https://gitlab.com/nthm/sinuous-packages/-/tree/work/sinuous-lifecycle
