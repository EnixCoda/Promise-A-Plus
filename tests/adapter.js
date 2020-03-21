const { Promise } = require("../");

module.exports = {
  resolved(value) {
    const promise = new Promise();
    Promise.resolve(promise, value);
    return promise;
  },
  rejected(reason) {
    const promise = new Promise();
    Promise.reject(promise, reason);
    return promise;
  },
  deferred() {
    const promise = new Promise();
    return {
      promise,
      resolve(value) {
        Promise.resolve(promise, value);
      },
      reject(reason) {
        Promise.reject(promise, reason);
      }
    };
  }
};
