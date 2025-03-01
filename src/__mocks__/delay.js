function delay(ms, options = {}) {
	return new Promise((resolve) => {
		setTimeout(() => {
			if (options.value !== undefined) {
				resolve(options.value);
			} else {
				resolve();
			}
		}, ms);
	});
}

delay.clearDelay = function clearDelay(delayPromise) {
	// Mock implementation of clearDelay
	return Promise.resolve();
};

// Support both CommonJS and ES Module
module.exports = delay;
module.exports.default = delay;
module.exports.clearDelay = delay.clearDelay;
module.exports.__esModule = true;
