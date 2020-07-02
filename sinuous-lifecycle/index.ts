import type { HyperscriptApi } from 'sinuous/h';
import type { El, Tracers } from 'sinuous-trace';

import { trace } from 'sinuous-trace';

// Use declare merging / module augmentation (seen below) to extend this
interface Lifecycle {
  onAttach: () => void
  onDetach: () => void
}

interface LifecyclePlugin {
  (api: HyperscriptApi, tracers: Tracers): void
  // This is a separate method to support the log plugin
  callTree(fn: keyof Lifecycle, root: El): void
  setLifecycle(fn: keyof Lifecycle, callback: () => void): void
}

declare module 'sinuous-trace' {
  interface RenderStackFrame {
    lifecycles?: Partial<Lifecycle>
  }
}

let childAlreadyConnected: boolean | undefined = undefined;

/** Wires up onAttach/onDetach lifecycles to run automatically */
const lifecyclePlugin: LifecyclePlugin = (api, tracers) => {
  const { add } = api;
  const { add: { onAttach }, rm: { onDetach } } = tracers;

  // Save state before the tracer runs
  api.add = (parent, child, end) => {
    childAlreadyConnected = (child as Node).isConnected;
    return add(parent, child, end);
  };
  tracers.add.onAttach = (parent, child) => {
    if (parent.isConnected && !childAlreadyConnected)
      lifecyclePlugin.callTree('onAttach', child as Node);
    childAlreadyConnected = undefined;
    onAttach(parent, child);
  };

  tracers.rm.onDetach = (parent, child) => {
    if (parent.isConnected) lifecyclePlugin.callTree('onDetach', child);
    onDetach(parent, child);
  };
};

/** Recursively run the lifecycles of a component and its children */
lifecyclePlugin.callTree = (fn, root) => {
  const meta = trace.meta.get(root);
  // Terser throws
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  const call = meta && meta.lifecycles && meta.lifecycles[fn];
  if (call) call();
  const children = trace.tree.get(root);
  if (children && children.size > 0)
    children.forEach(c => lifecyclePlugin.callTree(fn, c));
  // Note this is depth-first traversal
};

/** Bind the lifecycle function into the actively rendering component */
lifecyclePlugin.setLifecycle = (fn, callback) => {
  // Throws if there's no component rendering (stack empty)
  const rsf = trace.stack[trace.stack.length - 1];
  if (!rsf.lifecycles) rsf.lifecycles = {};
  rsf.lifecycles[fn] = callback;
};

export { Lifecycle, LifecyclePlugin }; // Types
export { lifecyclePlugin };
