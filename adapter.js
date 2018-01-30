const Promise = require('./Promise')

module.exports = {
  // creates a promise that is resolved with value.
  resolved(value) {
    return Promise.resolve(value)
  },
  // creates a promise that is already rejected with reason.
  rejected(reason) {
    return Promise.reject(reason)
  },
  // creates an object consisting of { promise, resolve, reject }:
  deferred() {
    let resolve, reject
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    return {
      promise,
      resolve,
      reject,
    }
  },
}
