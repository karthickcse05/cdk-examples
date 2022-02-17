import * as cdk from '@aws-cdk/core';
import * as examplestack from '../lib/cdk-example-stack';
import '@aws-cdk/assert/jest';
import { SynthUtils } from '@aws-cdk/assert';
import { Stack } from '@aws-cdk/core';


const myaws = { account: '321325872726', region: 'us-east-1' };

// Unit testing - fine-grained assertions on resources

/**
 * This is an example of a fine-grained test. This will check a single
 * aspect of the construct/stack.
 *
 * @see https://docs.aws.amazon.com/cdk/latest/guide/testing.html
 * @see https://aws.amazon.com/blogs/developer/testing-infrastructure-with-the-aws-cloud-development-kit-cdk/
 */


 test('test to check the secret manager name', () => {
    const stack = new cdk.App();
    const infrastructure = new examplestack.CdkExampleStack(stack, "CdkExampleStack",{
      env:myaws
    });
    expect(infrastructure).toHaveResource('AWS::SecretsManager::Secret', {
        Name: 'test'
    });
  });


  // SnapShot Testing
/**
 * This is an example of a snapshot test. This will essentially
 * check the "snapshot" to make sure it has everything we have defined,
 * and nothing more. It's essentially an integration test.
 *
 * @see https://docs.aws.amazon.com/cdk/latest/guide/testing.html
 * @see https://aws.amazon.com/blogs/developer/testing-infrastructure-with-the-aws-cloud-development-kit-cdk/
 */

 test("Test DB scout stack snapshot", () => {
    const stack = new Stack();
    const infrastructure = new examplestack.CdkExampleStack(stack, "CdkExampleTestStack",{
      env:myaws
    });
  
    expect(SynthUtils.toCloudFormation(infrastructure)).toMatchSnapshot();
  });