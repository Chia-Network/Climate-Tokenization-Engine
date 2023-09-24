/**
 * Sleeps for the given time in milliseconds.
 * @param {number} ms - Time in milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the specified time
 */
const waitFor = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = {
  waitFor,
};
