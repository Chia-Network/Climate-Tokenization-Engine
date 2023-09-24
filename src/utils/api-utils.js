/**
 * Sleeps for the given time in milliseconds.
 * @param {number} ms - Time in milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the specified time
 */
const waitFor = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Handles API request retries.
 * @param {Function} requestFn - Function containing the API request logic
 * @param {number} [maxRetries=3] - Maximum number of retries
 * @param {number} [retryInterval=5000] - Interval between retries in milliseconds
 * @returns {Promise<any>} A promise that resolves with the API request result
 */
const handleApiRequestWithRetries = async (requestFn, maxRetries = 3, retryInterval = 5000) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      retries += 1;
      if (retries >= maxRetries) {
        throw error;
      }
      await waitFor(retryInterval);
    }
  }
};

/**
 * Generate a URI for a given host and optional port, using the specified protocol.
 * @param {string} protocol - The protocol (e.g., 'http', 'https').
 * @param {string} host - The host (e.g., 'example.com').
 * @param {number | undefined} port - The optional port number.
 * @returns {string} The generated URI.
 */
function generateUriForHostAndPort(protocol, host, port) {
  let hostUri = `${protocol}://${host}`;
  if (port) {
    hostUri += `:${port}`;
  }
  return hostUri;
}

const updateQueryWithParam = (query, ...params) => {
  const currentParams = new URLSearchParams(query);
  params.forEach((paramItem) => {
    if (paramItem) {
      currentParams.append(paramItem.param, paramItem.value);
    }
  });
  const newParams = currentParams.toString();
  return `?${newParams}`;
};

module.exports = {
  waitFor,
  handleApiRequestWithRetries,
  generateUriForHostAndPort,
  updateQueryWithParam,
};
