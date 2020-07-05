import type { Trace } from 'sinuous-trace';
import type { Lifecycle, LifecycleMethods } from 'sinuous-lifecycle';

type LogLifecycleStyle = { [k in keyof LifecycleMethods]: string }
type LogLifecycleOptions = {
  consoleStyle: LogLifecycleStyle
}

// Defaults
const opts: LogLifecycleOptions = {
  consoleStyle: {
    onAttach: 'background: #A6E2B3', // Green
    onDetach: 'background: #F4A89A', // Red
  },
};

function logLifecycle(
  trace: Trace,
  lifecycle: Lifecycle,
  options: Partial<LogLifecycleOptions> = {}
): void {
  const { callTree } = lifecycle;

  const css: LogLifecycleStyle = Object.assign(
    opts.consoleStyle,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    options.consoleStyle || {}
  );
  const c = (lifecycleName: keyof LifecycleMethods, extraText = '') =>
    [`%c${lifecycleName}${extraText}`, `${css[lifecycleName]}`];

  let callCount = 0;
  let root: Element | DocumentFragment | Node | undefined = undefined;

  lifecycle.callTree = (fn, el) => {
    const meta = trace.meta.get(el);
    const compStr = meta ? `<${meta.name}/>` : el;
    const entryCall = !root;

    // Setup
    if (entryCall) {
      root = el;
      console.log(...c(fn, ' for tree'), compStr);
    }
    // Terser throws
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    const call = meta && meta.lifecycle && meta.lifecycle[fn];
    if (call) console.log(...c(fn), `(${++callCount})`, compStr, call);
    callTree(fn, el);

    // Cleanup
    if (entryCall) {
      root = undefined;
      callCount = 0;
    }
  };
}

export { logLifecycle };
