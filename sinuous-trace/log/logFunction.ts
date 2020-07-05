import type { Trace } from 'sinuous-trace';
import type { LogTraceOptions } from 'sinuous-trace/log';

// Placeholders to be filled in createLogFunction()

const traceRef = {} as Trace;
const optionsRef = {} as LogTraceOptions;

// If log() called inside log()
let subcall = false;

const limitedList = (head: string, children: unknown[]) => {
  let tail = '';
  const extra = children.length - optionsRef.maxArrayItems;
  if (extra > 0) {
    tail = `,(...+${extra} items)`;
    children = children.slice(0, optionsRef.maxArrayItems);
  }
  subcall = true;
  const str = `${head}[${children.map(log).join(',')}${tail}]`;
  subcall = false;
  return str;
};

const limitedString = (str: string) => {
  str = str.trim();
  const extra = str.length - optionsRef.maxStringLength;
  return extra > 0
    ? `"${str.slice(0, optionsRef.maxStringLength)}(...+${extra} chars)"`
    : `"${str}"`;
};

// Props and attributes are not currently serialized
const serializeNode = (node: Node) => {
  const isComp = traceRef.meta.get(node);
  if (isComp)
    return `<${isComp.name}/>`;

  const isGuard = traceRef.tree.get(node);
  const elName = node instanceof Element
    ? `<${node.tagName.toLowerCase()}>`
    : '[Fragment]';
  return isGuard
    ? `Guard${elName}`
    : elName;
};

/** Return a pretty printed string for debugging */
const log = (x: unknown): string => {
  if (Array.isArray(x)) {
    return subcall
      ? 'Array[...]'
      : limitedList('Array', x);
  }
  if (x instanceof Element || x instanceof DocumentFragment) {
    let node = serializeNode(x);
    // Attachment only matters for the root node, not any subcalls
    const isAttached = !subcall && document.body.contains(x);
    if (isAttached) {
      node = `🔗 ${node}`;
    }
    return subcall || x.childNodes.length === 0
      ? node
      : limitedList(node, Array.from(x.childNodes));
  }
  if (x instanceof Text) {
    return !x.textContent
      ? ''
      : limitedString(x.textContent);
  }
  if (typeof x === 'function') {
    return '$o' in x
      ? '[Observable]'
      : '[Function]';
  }
  if (typeof x === 'undefined') {
    return '∅';
  }
  // Try to show a Sinuous start mark node. Object key could be minified though
  const o = x as Record<string, unknown> | null;
  const k = o && Object.keys(o);
  // TS bug. It thinks "o" of "o[k[0]]" is possibly null despite "k" check
  if (o && k && k.length === 1 && o[k[0]] instanceof Text) {
    return '[StartMark]';
  }
  // Default to [object DataType]
  const str = String(x);
  return str.startsWith('[object ')
    ? str
    : limitedString(str);
};

const createLogFunction = (trace: Trace, options: LogTraceOptions): typeof log => {
  Object.assign(traceRef, trace);
  Object.assign(optionsRef, options);
  return log;
};

export { createLogFunction };
