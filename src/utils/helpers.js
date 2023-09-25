/**
 * Sleeps for the given time in milliseconds.
 * @param {number} ms - Time in milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the specified time
 */
const waitFor = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const parseSerialNumber = (serialNumberBlock) => {
  const serialNumberBlockPattern = /^([a-zA-Z0-9]+-)?(\d+)-(\d+)$/;
  const matches = serialNumberBlock.match(serialNumberBlockPattern);

  if (!matches) {
    return undefined; // Return undefined for wrong format
  }

  let prefix = null;
  let unitBlockStart;
  let unitBlockEnd;

  if (matches[1]) {
    prefix = matches[1].slice(0, -1); // Remove the trailing hyphen
  }
  unitBlockStart = matches[2];
  unitBlockEnd = matches[3];

  return { prefix, unitBlockStart, unitBlockEnd };
};

module.exports = {
  waitFor,
  parseSerialNumber,
};
