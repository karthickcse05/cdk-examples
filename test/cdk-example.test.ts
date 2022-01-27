import * as cdk from '@aws-cdk/core';
import * as CdkExample from '../lib/cdk-example-stack';
import '@aws-cdk/assert/jest';


const app = new cdk.App();
const myaws = { account: app.node.tryGetContext("accountNumber"), region: app.node.tryGetContext("region") };

test('test to check the queue name',  () => {
    const stack = new cdk.App();
    const infrastructure = new CdkExample.CdkExampleStack(stack, "ExampleTestStack",{
      env:myaws
    });
   
    expect(infrastructure).toHaveResource('AWS::SQS::Queue', {
        "QueueName": "cdktestQueue"
    });
  });