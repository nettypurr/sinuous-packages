import { createLogFunction } from './logFunction.js';

import type { HyperscriptApi } from 'sinuous/h';
import type { Trace, RenderStackFrame, InstanceMeta } from 'sinuous-trace';

type ReplacedApiMethods = keyof Pick<HyperscriptApi, 'h' | 'add' | 'insert' | 'property' | 'rm'>
type ReplacedTracerMethods = keyof Pick<Trace['tracers'], 'onCreate' | 'onAttach' | 'onDetach'>
type ReplacedMethods = ReplacedApiMethods | ReplacedTracerMethods

type LogTraceOptions = {
  /** Items to display of an array before saying "...(+N more)" */
  maxArrayItems: number,
  /** Characters to display of a string before saying "...(+N more)" */
  maxStringLength: number,
  /** Skip logging for h/add/insert/property/rm/on{Create,Attach,Detach} */
  skipMethods: ReplacedMethods[],
  /**
   * Dataset key for writing the component name into a DOM node
   * i.e `<h1 data-[componentDatasetTag]="MyComponent"></h1>`
   * Empty string disables this */
  componentDatasetTag: string,
}

const opts: LogTraceOptions = {
  maxArrayItems: 3,
  maxStringLength: 10,
  componentDatasetTag: 'component',
  skipMethods: [],
};

let refRSF: RenderStackFrame | undefined;
let initialParentDuringAdd: Element | DocumentFragment | Node | undefined;

function logTrace(
  api: HyperscriptApi,
  trace: Trace,
  options: Partial<LogTraceOptions> = {}
): void {
  const { tracers } = trace;
  const { onCreate, onAttach, onDetach } = tracers;
  const { h, add, insert, property, rm } = api;

  // Assume they'll have Object.assign. It's 2020.
  Object.assign(opts, options);
  // for (const k in options) opts[k] = options[k];

  const log = createLogFunction(trace, opts);

  const tag = (el: HTMLElement, name: string) =>
    el.dataset[opts.componentDatasetTag] = name;

  const replace = (key: ReplacedMethods) => !opts.skipMethods.includes(key);

  if (replace('h'))
    api.h = (fn, ...args) => {
      if (typeof fn === 'function') {
        console.group(`api.h() 🔶 ${fn.name}`);
        // During this h() the tracer will run and save the RSF
        const retH = h(fn, ...args);
        console.log(`${fn.name}: Done. Render data:`, refRSF);
        console.groupEnd();
        return retH;
      }
      return h(fn, ...args);
    };

  if (replace('onCreate'))
    tracers.onCreate = (_, el) => {
      refRSF = trace.meta.get(el) as InstanceMeta;
      const { name } = refRSF;
      if (!(el instanceof Node)) {
        console.log(`${name}: Function was not a component. Skipping`);
      } else {
      // Optionally provide a tag onto the element
        if (opts.componentDatasetTag) {
          if (el instanceof Element) tag(el as HTMLElement, name);
          else el.childNodes.forEach(x => tag(x as HTMLElement, `Fragment::${name}`));
        }
      }
      onCreate(_, el);
    };

  if (replace('add'))
    api.add = (parent, value, end) => {
      console.group('api.add()');
      console.log(`parent:${log(parent)}, value:${log(value)}`);
      initialParentDuringAdd = parent;
      // During this add() the tracer is called
      const retAdd = add(parent, value, end);
      initialParentDuringAdd = undefined;
      console.groupEnd();
      return retAdd;
    };

  if (replace('onAttach'))
    tracers.onAttach = (parent, child) => {
      const msg = `Tree attach: ${log(parent)} receives ${log(child)}`;
      console.log(
        parent === initialParentDuringAdd
          ? msg
          : `${msg} (Adoptive parent)`
      );
      onAttach(parent, child);
    };

  if (replace('insert'))
    api.insert = (el, value, endMark, current) => {
      console.group('api.insert()');
      console.log(`el:${log(el)}, value:${log(value)}, current:${log(current)}`);
      const retInsert = insert(el, value, endMark, current);
      console.groupEnd();
      return retInsert;
    };

  if (replace('property'))
    api.property = (el, value, name, ...rest) => {
      console.group('api.property()');
      console.log(`el:${log(el)}, value:${log(value)}, name:${log(name)}`);
      const retProperty = property(el, value, name, ...rest);
      console.groupEnd();
      return retProperty;
    };

  if (replace('rm'))
    api.rm = (parent, start, endMark) => {
      console.group('api.rm()');
      console.log(`parent:${log(parent)}, start:${log(start)}, endMark:${log(endMark)}`);
      const retRm = rm(parent, start, endMark);
      console.groupEnd();
      return retRm;
    };

  if (replace('onDetach'))
    tracers.onDetach = (parent, child) => {
      console.log(`Tree detach: ${log(parent)} unlinks ${log(child)}`);
      onDetach(parent, child);
    };
}

export { LogTraceOptions }; // Types
export { logTrace };
