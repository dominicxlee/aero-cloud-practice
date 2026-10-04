#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AeroCloudPracticeStack } from '../lib/aero-cloud-practice-stack';

const app = new cdk.App();

new AeroCloudPracticeStack(app, 'AeroCloudPracticeStack', {
  env: {
    account: '866731630829',
    region: 'eu-north-1',
  },
});
