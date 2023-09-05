const { ToadScheduler } = require("toad-scheduler");
const syncRetirements = require("./sync-retirements");

const scheduler = new ToadScheduler();
const jobRegistry = {};

const addJobToScheduler = (job) => {
  jobRegistry[job.id] = job;
  scheduler.addSimpleIntervalJob(job);
};

const start = () => {
  // add default jobs
  const defaultJobs = [
    syncRetirements
  ];
  defaultJobs.forEach((defaultJob) => {
    jobRegistry[defaultJob.id] = defaultJob;
    scheduler.addSimpleIntervalJob(defaultJob);
  });
};

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
  getJobStatus
}