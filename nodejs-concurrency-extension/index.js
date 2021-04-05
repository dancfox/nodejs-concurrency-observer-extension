#!/usr/bin/env node
const { register, next } = require('./extensions-api');

var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});

const EventType = {
    INVOKE: 'INVOKE',
    SHUTDOWN: 'SHUTDOWN',
};

function handleShutdown(event) {

    // Put Custom Metric
    var params = {
        MetricData: [ /* required */
        {
            MetricName: 'CONCURRENCY', /* required */
            Dimensions: [
                {
                Name: 'EXECUTION_ENVIRONMENT',
                Value: 'PROVISIONED'
                },
            ],
            Unit: 'Count',
            Value: -1
            },
        ],
        Namespace: 'TICKET_APP' /* required */
    };

    await putMetric(params);

    console.log('shutdown', { event });
    process.exit(0);
}

function handleInvoke(event) {
    console.log('invoke');
}

async function putMetric(params) {
    let cw = await cloudwatch.putMetricData(params).promise();
    console.log("putMetric: " + params);
    console.log(cw);
}

(async function main() {
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    console.log('hello from extension');

    // Put Custom Metric
    var params = {
        MetricData: [ /* required */
        {
            MetricName: 'CONCURRENCY', /* required */
            Dimensions: [
                {
                Name: 'EXECUTION_ENVIRONMENT',
                Value: 'PROVISIONED'
                },
            ],
            Unit: 'Count',
            Value: 1
            },
        ],
        Namespace: 'TICKET_APP' /* required */
    };

    await putMetric(params);

    console.log('register');
    const extensionId = await register();
    console.log('extensionId', extensionId);

    // execute extensions logic

    while (true) {
        console.log('next');
        const event = await next(extensionId);
        switch (event.eventType) {
            case EventType.SHUTDOWN:
                handleShutdown(event);
                break;
            case EventType.INVOKE:
                handleInvoke(event);
                break;
            default:
                throw new Error('unknown event: ' + event.eventType);
        }
    }
})();
