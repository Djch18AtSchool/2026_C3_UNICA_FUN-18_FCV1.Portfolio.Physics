import { createElement, memo, useRef, type ComponentType, type JSX } from 'react';

type AnyFunction = (...args: never[]) => unknown;
type Forwarder = (...args: unknown[]) => unknown;

/**
 * Memoizes a component whose props are values plus callbacks. The laboratories re-render ten
 * times a second while playing (the clock's settled time) and recreate their inline callbacks each
 * time, which would defeat `memo`: this wrapper hands the inner component one stable forwarder per
 * callback prop that always calls the latest one, so the inner component re-renders only when a
 * value prop changes. It matters for fields: React re-applies an <input>'s `name` and `type` on
 * every render even when nothing changed, so a field kept out of the 10 Hz path costs no DOM work
 * during playback.
 */
export function withStableCallbacks<P extends object>(
  Component: ComponentType<P>,
): (props: P) => JSX.Element {
  const Memoized = memo(Component);
  function Stable(props: P): JSX.Element {
    const latest = useRef(props);
    latest.current = props;
    const forwarders = useRef(new Map<string, Forwarder>());
    const stable = Object.fromEntries(
      Object.entries(props).map(([key, value]) => {
        if (typeof value !== 'function') return [key, value];
        let forwarder = forwarders.current.get(key);
        if (!forwarder) {
          forwarder = (...args) =>
            (latest.current as Record<string, AnyFunction>)[key](...(args as never[]));
          forwarders.current.set(key, forwarder);
        }
        return [key, forwarder];
      }),
    ) as P;
    return createElement(Memoized, stable);
  }
  Stable.displayName = `Stable(${Component.displayName ?? Component.name})`;
  return Stable;
}
