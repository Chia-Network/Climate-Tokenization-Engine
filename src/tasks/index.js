const { ToadScheduler } = require("toad-scheduler");
const { job: syncRetirements } = require("./sync-retirements");

/**
 * ToadScheduler instance
 * @type {ToadScheduler}
 */
const scheduler = new ToadScheduler();

/**
 * Registry to hold jobs
 * @type {Object}
 */
const jobRegistry = {};

/**
 * Add a job to the scheduler and registry
 *
 * @param {Object} job - The job to be scheduled
 */
const addJobToScheduler = (job) => {
  jobRegistry[job.id] = job;
  scheduler.addSimpleIntervalJob(job);
};

/**
 * Start the scheduler and add default jobs
 */
const start = () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  // Define default jobs
  const defaultJobs = [syncRetirements];

  // Add each default job to the scheduler and registry
  defaultJobs.forEach((defaultJob) => {
    jobRegistry[defaultJob.id] = defaultJob;
    scheduler.addSimpleIntervalJob(defaultJob);
  });
};

/**
 * Get the status of all jobs in the registry
 *
 * @returns {Object} Job status
 */
const getJobStatus = () => {
  return Object.keys(jobRegistry).reduce((status, key) => {
    status[key] = jobRegistry[key].getStatus();
    return status;
  }, {});
};

module.exports = {
  start,
  addJobToScheduler,
  jobRegistry,
  getJobStatus,
};
