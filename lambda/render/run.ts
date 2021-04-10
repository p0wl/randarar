import { writeFileSync } from "fs";

const handler = require('./index').handler;

const apiEvent = {
    queryStringParameters: {
        s: 'http://localhost:8080/LinkedInPreviewExport.svg',
        eventName: '12min.dynamic',
        logo: 'http://localhost:8080/wonder-logo.png',
    }
}

async function run() {
    console.time('run');
    const response = await handler(apiEvent, { awsRequestId: 'local' });
    console.timeEnd('run');
    writeFileSync('jetzz.png', response.body);
    console.log('response', response);
}
run();