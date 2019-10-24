# Bullrack

This is a simple API wrapper for [Bull](https://github.com/OptimalBits/bull) that lets you get the results of running specific jobs.

### Motivation
After a bit of searching I couldn't find a simple example of doing a job with Bull and getting the results without building a separate messsage queue and mapping job results to job creators. This library's goal is to provide a simple tool that allows returning the result of a specific job to the function that created the job.  You are responsible for setting up job processors and configuring Bull. This only exposes a contructor for a Class that has one method `doJob`
The only dependancy is Bull

### Basic example

server.js:  webserver that waits for clients to request a spreadsheet

```
const express = require('express')
const app = express()
const port = 3000

const Bullrack = require('bullrack');

const jobQueue = new Bullrack({
     // optionally pass redis config to the Bull this lib uses internally
    redisOptions: {port: 6379, host: '127.0.0.1', password: 'foobared'},
    // this should match whatever queue you have setup to process these jobs
    queueName: 'worker queue'
});

app.get('/', async (req, res, next) => {
    const spreadsheetUrl = await jobQueue.doJob('build-sheet', {
        headers: ['name', 'email', 'phone']
    });

    res.redirect(spreadsheetUrl);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
```

worker.js:  A job worker that builds spreadsheets based on a per request basis

```

const queue = new Bull('worker queue', {
    redis: {port: 6379, host: '127.0.0.1', password: 'foobared'}
});

// Work around issue https://github.com/OptimalBits/bull/issues/1340
queue.isReady().catch(err => {
    console.error('Cannot establish connection to Redis during startup, exiting...')
    console.error(err);

    process.exit(err);
});

// Setup your Bull processors however you like...
queue.process('build-sheet', function (job, done) {
    const headers = job.data.headers;

    // Your function that handles building the clients requested spreadsheet
    buildSheet(headers, done);
});

// You can add as many job processors to this queue as you see fit
queue.process('build-pdf', function (job, done) {
    const pdfParams = job.data;

    // Your function that handles building the clients requested PDF
    buildPdf(pdfParams, done);
});


```

Please feel free to contribute or request changes

