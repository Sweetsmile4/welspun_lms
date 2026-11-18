import serverless from 'serverless-http';
import { createApp } from './app.js';
import { parseEnvironment } from './platform/environment.js';

// No listener or database connection is opened by the Lambda adapter.
export const handler = serverless(createApp(parseEnvironment(process.env)));
