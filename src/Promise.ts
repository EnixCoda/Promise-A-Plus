import { oneTime, withPlatformCode } from "./utils";

type Fulfill<T, R> = (value: T) => R;
type Reject<T, R> = (reason: unknown) => R;

type Task = [Function | undefined, Function | undefined, $Promise];

class $Promise<T = any> {
  static resolve = resolve;
  static reject = reject;

  state: "pending" | "fulfilled" | "rejected" = "pending";
  value?: T;
  reason?: unknown;
  private tasks: Task[] = [];

  then<R1>(onFulfilled?: undefined, onRejected?: undefined): this;
  then<R1>(onFulfilled: Fulfill<T, R1>, onRejected?: undefined): $Promise<R1>;
  then<R2>(onFulfilled: undefined, onRejected: Reject<T, R2>): $Promise<T | R2>;
  then<R1, R2>(
    onFulfilled: Fulfill<T, R1>,
    onRejected: Reject<T, R2>
  ): $Promise<R1 | R2>;

  then(onFulfilled?: any, onRejected?: any) {
    if (!onFulfilled && !onRejected) return this;

    const promise = new $Promise();
    const task: Task = [
      typeof onFulfilled === "function" ? oneTime(onFulfilled) : undefined,
      typeof onRejected === "function" ? oneTime(onRejected) : undefined,
      promise
    ];
    if (this.state === "pending") {
      this.tasks.push(task);
    } else if (this.state === "fulfilled") {
      withPlatformCode(() => this.process(task));
    } else if (this.state === "rejected") {
      withPlatformCode(() => this.process(task));
    }
    return promise;
  }

  fulfill(value: $Promise<T>["value"]) {
    this.value = value;
    this.proceed("fulfilled");
  }

  reject(reason: $Promise<T>["reason"]) {
    this.reason = reason;
    this.proceed("rejected");
  }

  private proceed(state: $Promise["state"]) {
    withPlatformCode(() => {
      if (this.state !== "pending" && state !== this.state) return;
      this.state = state;

      for (const task of this.tasks) {
        this.process(task);
      }
    });
  }

  private process(task: Task) {
    const [onFulfilled, onRejected, promise] = task;
    const callback =
      this.state === "fulfilled"
        ? onFulfilled
        : this.state === "rejected"
        ? onRejected
        : undefined;

    if (callback) {
      try {
        const value = callback.call(
          undefined,
          this.state === "fulfilled"
            ? this.value
            : this.state === "rejected"
            ? this.reason
            : undefined
        );
        resolve(promise, value);
      } catch (e) {
        promise.reject(e);
      }
    } else {
      if (this.state === "fulfilled") {
        resolve(promise, this.value);
      } else if (this.state === "rejected") {
        promise.reject(this.reason);
      }
    }
  }
}

export const Promise = $Promise;

function resolve<T>(promise: $Promise<T>, x: unknown) {
  // TODO: detect circular thenable chain
  if (promise === x) {
    promise.reject(new TypeError("Promise and x refer to the same object"));
  } else if (x instanceof $Promise) {
    if (x.state === "pending") {
      x.then(
        value => resolve(promise, value),
        reason => promise.reject(reason)
      );
    } else if (x.state === "fulfilled") {
      promise.fulfill(x.value);
    } else if (x.state === "rejected") {
      promise.reject(x.reason);
    }
  } else if ((typeof x === "object" || typeof x === "function") && x) {
    let then;
    try {
      then = (x as any)?.then;
    } catch (e) {
      promise.reject(e);
      return;
    }

    if (typeof then === "function") {
      let called = false;
      const resolvePromise = (y: T) => {
        if (called) return;
        called = true;
        resolve(promise, y);
      };
      const rejectPromise = (r: unknown) => {
        if (called) return;
        called = true;
        promise.reject(r);
      };
      try {
        then.call(x, resolvePromise, rejectPromise);
      } catch (e) {
        if (called === false) {
          called = true;
          promise.reject(e);
        }
      }
    } else {
      promise.fulfill((x as any) as T);
    }
  } else {
    promise.fulfill(x as T);
  }
}

function reject<T>(promise: $Promise<T>, reason: unknown) {
  promise.reject(reason);
}
