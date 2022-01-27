import * as cdk from '@aws-cdk/core';
import * as CdkPipeline from '../lib/cdk-pipeline-stack';
import '@aws-cdk/assert/jest';


test('test to check the pipeline name',  () => {
    const context = require("../cdk.json");
    const stack = new cdk.App(context);
    const myaws = { account: stack.node.tryGetContext("accountNumber"), region: stack.node.tryGetContext("region") };
    const infrastructure = new CdkPipeline.CdkPipelineStack(stack, "PipelineTestStack",{
      env:myaws
    });

    expect(infrastructure).toHaveResource('AWS::CodePipeline::Pipeline', {
      Name: stack.node.tryGetContext("appName") +  "test",
    });
  });