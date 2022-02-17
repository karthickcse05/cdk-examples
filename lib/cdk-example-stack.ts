import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { BaseSecretManager } from './baseSecretManager';
import { RemovalPolicy } from '@aws-cdk/core';
import * as secretsManager from "@aws-cdk/aws-secretsmanager";

export class CdkExampleStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const queue = new sqs.Queue(this,"sqs",{
          queueName:"cdktestQueue",
          visibilityTimeout:cdk.Duration.minutes(30)
      })

      new BaseSecretManager(this,"secretValue",{
        secretName:"test",
        secretPropsName:"test",
        secretKeyValue:"test",
        secretString:"test",
        secretValue:"test",
        removalPolicy:RemovalPolicy.DESTROY,
      });

      new cdk.CfnOutput(this, 'sqs-arn', {
        value: queue.queueArn,
        exportName: 'cdktestQueue-arn',
      })
    }
}