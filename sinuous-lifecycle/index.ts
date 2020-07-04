import { api } from 'sinuous';
import { trace } from 'sinuous-trace';

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

let childAlreadyConnected: boolean | undefined = undefined;

// To support HMR this _has_ to happen outside of the setup function
const { tracers, stack, meta, tree } = trace;
const { onAttach, onDetach } = tracers;
const { add } = api;

/** Wires up onAttach/onDetach lifecycles to run automatically */
const lifecycle = (): void => {
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
  const instance = meta.get(root);
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  const call = instance && instance.lifecycle && instance.lifecycle[fn];
  if (call) call();
  const children = tree.get(root);
  if (children && children.size > 0)
    children.forEach(c => lifecycle.callTree(fn, c));
  // Note this is depth-first traversal
};

/** Bind the lifecycle function into the actively rendering component */
lifecycle.set = (fn: keyof LifecycleMethods, callback: () => void) => {
  // Throws if there's no component rendering (stack empty)
  const rsf = stack[stack.length - 1];
  if (!rsf.lifecycle) rsf.lifecycle = {};
  rsf.lifecycle[fn] = callback;
};

export { LifecycleMethods }; // Types
export { lifecycle };
