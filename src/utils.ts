export const withPlatformCode = process?.nextTick
  ? function withPlatformCode(callback: () => void) {
      process.nextTick(callback);
    }
  : function withPlatformCode(callback: () => void) {
      setTimeout(callback);
    };

export function oneTime<Args extends any[], R>(
  fn: (...args: Args) => R
): (...args: Args) => R {
  let called = false;
  return function(...args: Args) {
    if (called) throw new Error(`Calling more than once`);
    called = true;
    return fn(...args);
  };
}
