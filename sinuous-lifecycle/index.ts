import type { HyperscriptApi } from 'sinuous/h';
import type { Trace } from 'sinuous-trace';

type El = Element | DocumentFragment | Node
// Use declare merging / module augmentation (seen below) to extend this
interface LifecycleMethods {
  onAttach: () => void
  onDetach: () => void
}

declare module 'sinuous-trace' {
  interface RenderStackFrame {
    lifecycle?: Partial<LifecycleMethods>
  }
}

const traceRef = {} as Trace;
let childAlreadyConnected: boolean | undefined = undefined;

/** Wires up onAttach/onDetach lifecycles to run automatically */
const lifecycle = (api: HyperscriptApi, trace: Trace): void => {
  Object.assign(traceRef, trace);
  const { tracers } = traceRef;
  const { onAttach, onDetach } = tracers;
  const { add } = api;

  // Save state before the tracer runs
  api.add = (parent, child, end) => {
    childAlreadyConnected = (child as Node).isConnected;
    return add(parent, child, end);
  };
  tracers.onAttach = (parent, child) => {
    if (parent.isConnected && !childAlreadyConnected)
      lifecycle.callTree('onAttach', child as Node);
    childAlreadyConnected = undefined;
    onAttach(parent, child);
  };

  tracers.onDetach = (parent, child) => {
    if (parent.isConnected) lifecycle.callTree('onDetach', child);
    onDetach(parent, child);
  };
};

/** Recursively run the lifecycles of a component and its children */
lifecycle.callTree = (fn: keyof LifecycleMethods, root: El) => {
  const meta = traceRef.meta.get(root);
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  const call = meta && meta.lifecycle && meta.lifecycle[fn];
  if (call) call();
  const children = traceRef.tree.get(root);
  if (children && children.size > 0)
    children.forEach(c => lifecycle.callTree(fn, c));
  // Note this is depth-first traversal
};

/** Bind the lifecycle function into the actively rendering component */
lifecycle.set = (fn: keyof LifecycleMethods, callback: () => void) => {
  // Throws if there's no component rendering (stack empty)
  const rsf = traceRef.stack[traceRef.stack.length - 1];
  if (!rsf.lifecycle) rsf.lifecycle = {};
  rsf.lifecycle[fn] = callback;
};

type Lifecycle = typeof lifecycle;
export { LifecycleMethods, Lifecycle }; // Types
export { lifecycle };
