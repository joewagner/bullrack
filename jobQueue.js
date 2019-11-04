const EventEmitter = require('events');
const Bull = require('bull');

// This is a wrapper API for Bull that allows creating jobs in a way that you can see when they are done
const JobQueue = function (config) {
    if (config === void 0) config = {};

    this.config = config;
    this.queueName = config.queueName || 'worker queue';

    this.queue = new Bull(this.queueName, {
        redis: config.redisOptions
    });

    this.queue.on('global:completed', (jobId, result) => {
        this.callbackEmitter.emit('completed:' + jobId, result);
    });

    this.queue.on('global:failed', (jobId, err) => {
        this.callbackEmitter.emit('failed:' + jobId, err);
    });

    this.callbackEmitter = new EventEmitter();

};

// method that creates job and returns a promise that will be resolved or rejected with results of the job
JobQueue.prototype.doJob = function (name, data) {
    return new Promise((resolve, reject) => {
        this.queue.add(name, data).then(job => {

            const completed = (result) => {
                // event data is always passed as the result of JSON.stringify
                // We need to attempt to JSON.parse it
                // NOTE: even if the result of the job is a String it's still given to JSON.stringify, 
                //       which wraps the string in quotes, but JSON.parse must still be called to unwrap
                //       the quotes surrounding the original String 
                try {
                    result = JSON.parse(result);
                } catch (err) {
                    if (process.env.DEBUG === 'bullrack') {
                        console.error(err);
                        console.log('\ncould not `JSON.parse` job result ' + job.id + '\n');
                        console.log(result);
                    }
                }
                resolve(result);

                // remove failed listener for this job since it will never be called
                this.callbackEmitter.off('failed:' + job.id, failed);
            };

            const failed = (err) => {
                // It seems that Bull passes the error as a string
                if (typeof err === 'string') err = new Error(err);

                reject(err);

                // remove completed listener for this job since it will never be called
                this.callbackEmitter.off('completed:' + job.id, completed);
            };

            this.callbackEmitter.once('completed:' + job.id, completed);
            this.callbackEmitter.once('failed:' + job.id, failed);

        }).catch(err => {
            reject(err);
        });

    });

};

module.exports = JobQueue;

