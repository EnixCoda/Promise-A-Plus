/**
 * an simple implementation of Promise/A+
 * https://promisesaplus.com/
 * 
 * passed 100% tests of promises-aplus-tests
 * https://github.com/promises-aplus/promises-tests
 */

function noop() {}

/**
 * A promise represents the eventual result of an asynchronous operation. The
 * primary way of interacting with a promise is through its then method, which
 * registers callbacks to receive either a promise’s eventual value or the
 * reason why the promise cannot be fulfilled.
 * 
 * @class Promise
 * @property {PromiseState} state
 * @property {QueueItem[]} queue
 */
class Promise {
  constructor(func) {
    this.queue = []
    this.state = Promise.states.pending
    func(resolve.bind(undefined, this), reject.bind(undefined, this))
  }

  /**
   * A promise must provide a then method to access its current or eventual value or reason.
   * A promise’s then method accepts two arguments:
   * 
   * `promise.then(onFulfilled, onRejected)`
   * 
   * @param {Function} [onFulfilled] 
   * @param {Function} [onRejected] 
   * @returns {Promise}
   * @memberof Promise
   */
  then(onFulfilled, onRejected) {
    const promise = new Promise(noop)
    /**
     * @typedef QueueItem
     * @type {Object}
     * @property {Promise} promise
     * @property {Function} onFulfilled 
     * @property {Function} onRejected 
     */
    this.queue.push({
      promise,
      onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : undefined, // 2.2.1.1
      onRejected: typeof onRejected === 'function' ? onRejected : undefined, // 2.2.1.2
    })
    if (
      this.state === Promise.states.fulfilled || // 2.2.2
      this.state === Promise.states.rejected // 2.2.3
    ) {
      execQueue(this)
    }
    return promise // 2.2.7
  }


  /**
   * @static
   * @param {any} value 
   * @returns {Promise} a promise fulfilled with the value provided
   * @memberof Promise
   */
  static resolve(value) {
    return new Promise(function (resolve) {
      resolve(value)
    })
  }

  /**
   * @static
   * @param {any} reason 
   * @returns {Promise} a promise rejected with the value provided as reason
   * @memberof Promise
   */
  static reject(reason) {
    return new Promise(function (resolve, reject) {
      reject(reason)
    })
  }
}

/**
 * 2.1 Promise States
 * 
 * A promise must be in one of three states:
 *  pending, fulfilled, or rejected.
 * 
 * @typedef {'PENDING'|'FULFILLED'|'REJECTED'} PromiseState
 */
Promise.states = {
  pending: 'PENDING',
  fulfilled: 'FULFILLED',
  rejected: 'REJECTED',
}

/**
 * help assign v to `value` or `reason` field of promise according to its state
 */
const valueOrReasonMap = new Map([
  [Promise.states.fulfilled, 'value'],
  [Promise.states.rejected, 'reason'],
])

/**
 * core logic of `fulfill` and `reject`
 * 
 * @param {Promise} promise 
 * @param {PromiseState} targetState 
 * @param {any} v
 */
function transformState(promise, targetState, v) {
  if (promise.state === Promise.states.pending) {
    promise.state = targetState // 2.1.1.1
    promise[valueOrReasonMap.get(targetState)] = v // 2.1.2.2
    Object.freeze(promise) // 2.1.2.1
  }
  if (promise.state === targetState) {
    execQueue(promise) // 2.2.2
  }
}

/**
 * fulfill a promise with value
 * 
 * @param {Promise} promise 
 * @param {Object|number|string|boolean|null} value 
 */
function fulfill(promise, value) {
  transformState(promise, Promise.states.fulfilled, value)
}

/**
 * reject a promise with reason
 * 
 * @param {Promise} promise 
 * @param {Object|number|string|boolean|null} reason 
 */
function reject(promise, reason) {
  transformState(promise, Promise.states.rejected, reason)
}

/**
 * The Promise Resolution Procedure
 * 
 * The promise resolution procedure is an abstract operation taking as input a
 * promise and a value, which we denote as \[\[Resolve\]\](promise, x). If x is a
 * thenable, it attempts to make promise adopt the state of x, under the
 * assumption that x behaves at least somewhat like a promise. Otherwise, it
 * fulfills promise with the value x.
 * 
 * This treatment of thenables allows promise implementations to interoperate,
 * as long as they expose a Promises/A+-compliant then method. It also allows
 * Promises/A+ implementations to “assimilate” nonconformant implementations
 * with reasonable then methods.
 * 
 * @param {Promise} promise 
 * @param {any} x 
 * @returns
 */
function resolve(promise, x) {
  if (x === promise) {
    throw new TypeError() // 2.3.1
  } else if (x instanceof Promise) {
    switch (x.state) {
      case Promise.states.pending: // 2.3.2.1
        x.then(fulfill.bind(undefined, promise), reject.bind(undefined, promise))
        break
      case Promise.states.fulfilled: // 2.3.2.2
        fulfill(promise, x.value)
        break
      case Promise.states.rejected: // 2.3.2.3
        reject(promise, x.reason)
        break
    }
  } else if (typeof x === 'object' && x !== null || typeof x === 'function') {
    try {
      const then = x.then // 2.3.3.1
      if (typeof then === 'function') { // 2.3.3.3
        let resolvePromiseCalled = false, rejectPromiseCalled = false
        function resolvePromise (y) { // 2.3.3.3.3
          if (resolvePromiseCalled || rejectPromiseCalled) return
          resolvePromiseCalled = true
          resolve(promise, y) // 2.3.3.3.1
        }
        function rejectPromise (r) { // 2.3.3.3.3
          if (resolvePromiseCalled || rejectPromiseCalled) return
          rejectPromiseCalled = true
          reject(promise, r) // 2.3.3.3.2
        }

        try {
          then.call(x, resolvePromise, rejectPromise) // 2.3.3.3
        } catch(e) {
          if (!(resolvePromiseCalled || rejectPromiseCalled)) {
            reject(promise, e)
          }
        }
      } else {
        fulfill(promise, x) // 2.3.3.4
      }
    } catch(e) {
      reject(promise, e) // 2.3.3.2
    }
  } else {
    fulfill(promise, x) // 2.3.4
  }
}

/**
 * extract a queue item
 * 
 * @param {Promise} p 
 * @param {QueueItem} task 
 * @returns {Object}
 */
function extract(p, task) {
  const { promise, onFulfilled, onRejected } = task
  switch (p.state) {
    case Promise.states.fulfilled:
      return {
        promise,
        handler: onFulfilled,
        fallback: fulfill,
        v: p.value,
      }
    case Promise.states.rejected:
      return {
        promise,
        handler: onRejected,
        fallback: reject,
        v: p.reason,
      }
  }
}

/**
 * reducer for promise.queue
 * 
 * @param {Promise} p
 * @returns 
 */
function execQueue(p) {
  function tick() {
    if (p.queue.length) {
      const task = p.queue.shift()
      const { promise, handler, fallback, v } = extract(p, task)
      if (handler) {
        setTimeout(
          function() {
            try {
              const result = handler(v) // 2.2.2.1, 2.2.3.1
              resolve(promise, result)
            } catch(e) {
              reject(promise, e)
            } finally {
              tick()
            }
          },
          0
        )
      } else {
        fallback(promise, v)
        tick()
      }
    }
  }
  tick()
}

module.exports = Promise
