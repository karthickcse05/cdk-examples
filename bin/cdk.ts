#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkPipelineStack } from '../lib/cdk-pipeline-stack';
import { CdkExampleStack } from '../lib/cdk-example-stack';

const app = new cdk.App();
const myaws = { account: app.node.tryGetContext("accountNumber"), region: app.node.tryGetContext("region") };
new CdkPipelineStack(app, 'CdkCodepipelineStack', {
  env:myaws,
  description:"stack for cicd",
  stackName:"stack-cicd"
});

new CdkExampleStack(app, 'CdkExampleStack', {
  env:myaws,
  description:"cicd stack for testing",
  stackName:"stack-cicd-test"
});

