import * as cdk from '@aws-cdk/core';
//import * as CdkPipeline from '../lib/cdk-pipeline-stack';
import '@aws-cdk/assert/jest';


const app = new cdk.App();
const myaws = { account: app.node.tryGetContext("accountNumber"), region: app.node.tryGetContext("region") };

// const mockgetSecretValue = jest.fn((SecretId) => {
//     switch (SecretId) {
//       case "secret1":
//         return {
//           SecretString: "secret-1-value",
//         };
//       case "secret2":
//         return {
//           SecretString: "secret-2-value",
//         };
//       default:
//         throw Error("secret not found");
//     }
//   });
  
//   jest.mock("aws-sdk", () => {
//     return {
//       config: {
//         update() {
//           return {};
//         },
//       },
//       SecretsManager: jest.fn(() => {
//         return {
//             secretsManager: jest.fn(({ SecretId }) => {
//             return {
//               promise: () => mockgetSecretValue(SecretId),
//             };
//           }),
//         };
//       }),
//     };
//   });
  

// test('test to check the pipeline name',  () => {
//     const stack = new cdk.App();
//     const infrastructure = new CdkPipeline.CdkPipelineStack(stack, "PipelineTestStack",{
//       env:myaws
//     });
   
//     expect(infrastructure).toHaveResource('AWS::CodePipeline::Pipeline', {
//       Name: stack.node.tryGetContext("appName") +  "test",
//     });
//   });