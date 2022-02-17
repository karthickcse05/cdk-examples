import * as secretsManager from "@aws-cdk/aws-secretsmanager";
import * as cdk from '@aws-cdk/core';
import { IManagedPolicy, Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { SecretStringValueBeta1 } from "@aws-cdk/aws-secretsmanager";
import { Data } from "aws-sdk/clients/firehose";

export interface SecretManagerProps {
    readonly secretPropsName: string;
    readonly secretName: string;
    readonly secretString: string;
    readonly secretKeyValue: string;
    readonly secretValue: string;
    readonly secretDescription?: string;
    readonly removalPolicy?: cdk.RemovalPolicy
    readonly replicaRegions?: secretsManager.ReplicaRegion[];
    readonly role?: Role;
}

export class BaseSecretManager extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: SecretManagerProps) {
        super(scope, id);
        
        const secret = new secretsManager.Secret(this, props.secretPropsName, {
            description: props.secretDescription,
            secretName:props.secretName,
            removalPolicy:props.removalPolicy,
            replicaRegions:props.replicaRegions,
            generateSecretString: {
                secretStringTemplate: JSON.stringify(props.secretName),
                generateStringKey: props.secretKeyValue,
            },
        });

        new cdk.CfnOutput(this, 'secret-arn', {
            value: secret.secretArn,
            exportName: 'cdksecret-arn',
          })

    }
}