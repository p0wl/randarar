#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { RandararCdkStack } from '../lib/randarar-cdk-stack';

const app = new cdk.App();
new RandararCdkStack(app, 'RandararCdkStack');
