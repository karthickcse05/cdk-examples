import * as cdk from '@aws-cdk/core';
import * as kms from '@aws-cdk/aws-kms';
import { PolicyStatement, PolicyDocument, Effect, ArnPrincipal, ServicePrincipal } from '@aws-cdk/aws-iam';
import * as parameters from "../cdk.json";
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';
import { ComparisonOperator,  TreatMissingData } from '@aws-cdk/aws-cloudwatch';
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";


export class Injest extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const ProjectName = parameters.context.config.ProjectName;
        const ProjectEnvironment = parameters.context.config.ProjectEnvironment;
        const ReleaseGroup = parameters.context.config.ReleaseGroup;

        const rootFullControl = new PolicyStatement({
            actions: ["kms:CancelKeyDeletion",
                "kms:CreateAlias",
                "kms:CreateGrant",
                "kms:CreateKey",
                "kms:Decrypt",
                "kms:DeleteAlias",
                "kms:DescribeKey",
                "kms:DisableKey",
                "kms:DisableKeyRotation",
                "kms:EnableKey",
                "kms:EnableKeyRotation",
                "kms:Encrypt",
                "kms:GenerateDataKey",
                "kms:GetKeyPolicy",
                "kms:GetKeyRotationStatus",
                "kms:GetparametersForImport",
                "kms:GetPublicKey",
                "kms:ImportKeyMaterial",
                "kms:ListAliases",
                "kms:ListGrants",
                "kms:ListKeyPolicies",
                "kms:ListKeys",
                "kms:ListResourceTags",
                "kms:ListRetirableGrants",
                "kms:PutKeyPolicy",
                "kms:ReEncryptFrom",
                "kms:ReEncryptTo",
                "kms:Retire",
                "kms:RevokeGrant",
                "kms:ScheduleKeyDeletion",
                "kms:Sign",
                "kms:TagResource",
                "kms:UntagResource",
                "kms:UpdateAlias",
                "kms:Verify",
            ],
            effect: Effect.ALLOW,
            resources: ["*"],
            principals: [new ArnPrincipal(parameters.context.config.Principals)]

        })

        const enableAdministration = new PolicyStatement({
            actions: ["kms:CancelKeyDeletion",
                "kms:CreateAlias",
                "kms:CreateGrant",
                "kms:CreateKey",
                "kms:DeleteAlias",
                "kms:DescribeKey",
                "kms:DisableKey",
                "kms:DisableKeyRotation",
                "kms:EnableKey",
                "kms:EnableKeyRotation",
                "kms:GetKeyPolicy",
                "kms:GetKeyRotationStatus",
                "kms:GetparametersForImport",
                "kms:GetPublicKey",
                "kms:ListAliases",
                "kms:ListGrants",
                "kms:ListKeyPolicies",
                "kms:ListKeys",
                "kms:ListResourceTags",
                "kms:ListRetirableGrants",
                "kms:PutKeyPolicy",
                "kms:RevokeGrant",
                "kms:ScheduleKeyDeletion",
                "kms:TagResource",
                "kms:UntagResource",
                "kms:UpdateAlias",
            ],
            effect: Effect.ALLOW,
            resources: ["*"],
            principals: [new ArnPrincipal(parameters.context.config.administrationPrincipals)]

        })


        const accessForServicePrincipals = new PolicyStatement({
            actions: ["kms:Decrypt",
                "kms:GenerateDataKey",
                "kms:GenerateDataKeyPair"
            ],
            effect: Effect.ALLOW,
            resources: ["*"],
            principals: [new ServicePrincipal("sns.amazonaws.com"), new ServicePrincipal("s3.amazonaws.com")]

        })

        const encryptionViaSQS = new PolicyStatement({
            actions: ["kms:Encrypt",
                "kms:Decrypt",
                "kms:DescribeKey",
                "kms:GenerateDataKey",
                "kms:GenerateDataKeyPair",
                "kms:ReEncryptFrom",
                "kms:ReEncryptTo",
            ],
            effect: Effect.ALLOW,
            resources: ["*"],
            principals: [new ArnPrincipal("*")],
            conditions: {
                "kms:ViaService": parameters.context.config.conditions, "kms:CallerAccount": parameters.context.config.CallerAccount
            }

        })

        const sqsMessageKey = new kms.Key(this, 'SQSMessageKey', {
            enableKeyRotation: true,
            enabled: true,
            description: "Customer key for encrypting SQS messages",
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            policy: new PolicyDocument({
                statements: [encryptionViaSQS, accessForServicePrincipals, enableAdministration, rootFullControl]
            })
        });


        sqsMessageKey.addAlias("alias/" + ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-SQSMessageKey")


        //  ############################## Source Collection Resources ##############################

        // SNS - 1
        const snsTopicsourcesValidation = new sns.Topic(this,"snsTopicsourcesValidation",{
            displayName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-source-collection-validation-topic",
        })

        const snsTopicsourcesValidationPolicy = new sns.TopicPolicy(this,"snsTopicsourcesValidationPolicy",{
            topics: [snsTopicsourcesValidation]
        });

        
        const snsTopicsourcesValidationPolicyStatement = new PolicyStatement({
            actions: [
                "SNS:GetTopicAttributes",
                "SNS:SetTopicAttributes",
                "SNS:AddPermission",
                "SNS:RemovePermission",
                "SNS:DeleteTopic",
                "SNS:Subscribe",
                "SNS:ListSubscriptionsByTopic",
                "SNS:Publish",
                "SNS:Receive"
            ],
            effect: Effect.ALLOW,
            resources: [snsTopicsourcesValidation.topicArn],
            principals: [new ArnPrincipal("*")],
            //conditions: conditionValue
            conditions: {
                "ArnLike": {
                    "aws:SourceArn": ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-sourvesBucketArn"
                }
            }

        })

        snsTopicsourcesValidationPolicy.document.addStatements(snsTopicsourcesValidationPolicyStatement);


        // SNS - 2
        const snsTopicsourcesDLQAlert = new sns.Topic(this,"SNSTopicsourvesDLQAlert",{
            displayName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-source-collection-dlq-alert-topic",
        })

        new sns.Subscription(this, 'snsTopicsourvesDLQAlertemailSubscription', {
            endpoint: parameters.context.config.NotificationEmailsources,
            protocol: sns.SubscriptionProtocol.EMAIL,
            topic:snsTopicsourcesDLQAlert,
        });

        const snsTopicPolicysourcesDLQAlert = new sns.TopicPolicy(this,"snsTopicPolicysourcesDLQAlert",{
            topics: [snsTopicsourcesDLQAlert]
        });

        
        const snsTopicsourcesValidationDLQAlertPolicyStatement = new PolicyStatement({
            actions: [
                "SNS:GetTopicAttributes",
                "SNS:SetTopicAttributes",
                "SNS:AddPermission",
                "SNS:RemovePermission",
                "SNS:DeleteTopic",
                "SNS:Subscribe",
                "SNS:ListSubscriptionsByTopic",
                "SNS:Publish",
                "SNS:Receive"
            ],
            effect: Effect.ALLOW,
            resources: [snsTopicsourcesDLQAlert.topicArn],
            principals: [new ArnPrincipal("*")],
            //conditions: conditionValueDLQAlert
            conditions: {
                "StringEquals": {
                    "aws:SourceOwner": parameters.context.config.AccountID
                }
            }
        })

        const snsTopicsourcesValidationDLQAlertPolicyStatement1 = new PolicyStatement({
            actions: [
                "SNS:Publish"
            ],
            effect: Effect.ALLOW,
            resources: [snsTopicsourcesDLQAlert.topicArn],
            principals: [new ServicePrincipal("cloudwatch.amazonaws.com")],
        })

        snsTopicPolicysourcesDLQAlert.document.addStatements(snsTopicsourcesValidationDLQAlertPolicyStatement);
        snsTopicPolicysourcesDLQAlert.document.addStatements(snsTopicsourcesValidationDLQAlertPolicyStatement1);


        // SQS - 1
        const sourcesValidationDeadLetterQueue = new sqs.Queue(this,"sourcesValidationDeadLetterQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-source-collection-validation-dead-letter-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            visibilityTimeout: cdk.Duration.seconds(30),
            
        });

        const deadLetterQueue: sqs.DeadLetterQueue = {
            maxReceiveCount: 123,
            queue: sourcesValidationDeadLetterQueue,
        };

        // SQS - 2
        const sourcesValidationQueue = new sqs.Queue(this,"sourcesValidationQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-source-collection-validation-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: deadLetterQueue,
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const sourcesValidationQueuePolicy = new sqs.QueuePolicy(this,"sourcesValidationQueuePolicy",{
            queues:[sourcesValidationQueue],
        });

        const sourcesValidationQueueStatement = new PolicyStatement({
            actions: ["SQS:SendMessage"],
            effect: Effect.ALLOW,
            resources: [sourcesValidationQueue.queueArn,snsTopicsourcesValidation.topicArn],
            principals: [new ArnPrincipal("*")],

        })

        sourcesValidationQueuePolicy.document.addStatements(sourcesValidationQueueStatement);

        new sns.Subscription(this, 'emailSubscription', {
            endpoint: parameters.context.config.NotificationEmailsources,
            protocol: sns.SubscriptionProtocol.EMAIL,
            topic:snsTopicsourcesValidation,
        });

        new sns.Subscription(this, 'QueueSubscription', {
            endpoint: sourcesValidationQueue.queueArn,
            protocol: sns.SubscriptionProtocol.SQS,
            topic:snsTopicsourcesValidation,
        });

        // cloudwatch alarm -1

        const metric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensions: {
                QueueName: sourcesValidationDeadLetterQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Average",
        });

        const sourcesValidationDeadLetterQueueMessageAlarm = new cloudwatch.Alarm(this,"sourvesValidationDeadLetterQueueMessageAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-sourvesValidationDeadLetterQueueMessageAlarm",
            alarmDescription:"A message was sent on the source collection validation error queue",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:0,
            treatMissingData: TreatMissingData.MISSING,
            metric: metric,
        });

        sourcesValidationDeadLetterQueueMessageAlarm.addAlarmAction(new SnsAction(snsTopicsourcesDLQAlert))


        // cloudwatch alarm - 2

        const duratonAlarmmetric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateAgeOfOldestMessage",
            dimensions: {
                QueueName: sourcesValidationQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Maximum",
        });

        const sourcesValidationDurationAlarm = new cloudwatch.Alarm(this,"sourcesValidationDurationAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-sourvesValidationDurationAlarm",
            alarmDescription:"A source collection validation message exceeded 12 hours in duration",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:43200,
            treatMissingData: TreatMissingData.MISSING,
            metric: duratonAlarmmetric,
        });

        sourcesValidationDurationAlarm.addAlarmAction(new SnsAction(snsTopicsourcesDLQAlert))

        // ############################## Destination Publishing Resources ##############################



        // SQS - 1
        const destinationValidationDeadLetterQueue = new sqs.Queue(this,"DestinationValidationDeadLetterQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-validation-dead-letter-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            visibilityTimeout: cdk.Duration.seconds(30),
            
        });

        const destinationdeadLetterQueue: sqs.DeadLetterQueue = {
            maxReceiveCount: 123,
            queue: destinationValidationDeadLetterQueue,
        };

        // SQS - 2
        const destinationValidationQueue = new sqs.Queue(this,"DestinationValidationQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-validation-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: destinationdeadLetterQueue,
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const destinationValidationQueuePolicy = new sqs.QueuePolicy(this,"DestinationValidationQueuePolicy",{
            queues:[destinationValidationQueue],
        });

        const destinationValidationQueuePolicyStatement = new PolicyStatement({
            actions: [
                "SQS:AddPermission",
                "SQS:DeleteMessage",
                "SQS:GetQueueAttributes",
                "SQS:ReceiveMessage",
                "SQS:RemovePermission",
                "SQS:SendMessage",
                "SQS:SetQueueAttributes"
            ],
            effect: Effect.ALLOW,
            resources: [destinationValidationQueue.queueArn],
            principals: [new ArnPrincipal("*")],
            conditions: {
                "ArnLike": {
                    "aws:SourceArn": ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationBucketArn"
                }
            }
        })

        destinationValidationQueuePolicy.document.addStatements(destinationValidationQueuePolicyStatement);

        

        // SQS - 3
        const destinationTaggingDeadLetterQueue = new sqs.Queue(this,"DestinationTaggingDeadLetterQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-tagging-dead-letter-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            visibilityTimeout: cdk.Duration.seconds(30),
            
        });

        const destinationTaggingDLQ: sqs.DeadLetterQueue = {
            maxReceiveCount: 123,
            queue: destinationTaggingDeadLetterQueue,
        };

        // SQS - 4
        const destinationTaggingQueue = new sqs.Queue(this,"DestinationTaggingQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-tagging-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: destinationTaggingDLQ,
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const destinationTaggingQueuePolicy = new sqs.QueuePolicy(this,"DestinationValidationQueuePolicy",{
            queues:[destinationTaggingQueue],
        });

        const destinationTaggingQueuePolicyStatement = new PolicyStatement({
            actions: [
                "SQS:AddPermission",
                "SQS:DeleteMessage",
                "SQS:GetQueueAttributes",
                "SQS:ReceiveMessage",
                "SQS:RemovePermission",
                "SQS:SendMessage",
                "SQS:SetQueueAttributes"
            ],
            effect: Effect.ALLOW,
            resources: [destinationTaggingQueue.queueArn],
            principals: [new ArnPrincipal("*")],
            conditions: {
                "ArnLike": {
                    "aws:SourceArn": ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationBucketArn"
                }
            }
        })

        destinationTaggingQueuePolicy.document.addStatements(destinationTaggingQueuePolicyStatement);


        // SQS - 5
        const destinationSubmissionDeadLetterQueue = new sqs.Queue(this,"DestinationSubmissionDeadLetterQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-submission-dead-letter-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            visibilityTimeout: cdk.Duration.seconds(30),
            
        });

        const destinationSubmissionDLQ: sqs.DeadLetterQueue = {
            maxReceiveCount: 123,
            queue: destinationSubmissionDeadLetterQueue,
        };

        // SQS - 6
        const destinationSubmissionQueue = new sqs.Queue(this,"DestinationSubmissionQueue",{
            dataKeyReuse: cdk.Duration.hours(24),
            encryptionMasterKey: sqsMessageKey,
            maxMessageSizeBytes: 262144,
            retentionPeriod: cdk.Duration.days(14),
            queueName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-submission-queue",
            removalPolicy:  cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: destinationSubmissionDLQ,
            visibilityTimeout: cdk.Duration.seconds(30),
        });

        const destinationSubmissionQueuePolicy = new sqs.QueuePolicy(this,"destinationSubmissionQueuePolicy",{
            queues:[destinationSubmissionQueue],
        });

        const destinationSubmissionQueuePolicyStatement = new PolicyStatement({
            actions: [
                "SQS:AddPermission",
                "SQS:DeleteMessage",
                "SQS:GetQueueAttributes",
                "SQS:ReceiveMessage",
                "SQS:RemovePermission",
                "SQS:SendMessage",
                "SQS:SetQueueAttributes"
            ],
            effect: Effect.ALLOW,
            resources: [destinationSubmissionQueue.queueArn],
            principals: [new ArnPrincipal("*")],
        })

        destinationSubmissionQueuePolicy.document.addStatements(destinationSubmissionQueuePolicyStatement);


        // SNS - 1
        const snsTopicDestinationDLQAlert = new sns.Topic(this,"SNSTopicDestinationDLQAlert",{
            displayName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-dlq-alert-topic",
            topicName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-destination-publishing-dlq-alert-topic",
        });

        const snsTopicPolicyDestinationDLQAlert = new sns.TopicPolicy(this,"SNSTopicPolicyDestinationDLQAlert",{
            topics: [snsTopicDestinationDLQAlert]
        });

        const snsTopicPolicyDestinationDLQAlertPolicyStatement = new PolicyStatement({
            actions: [
                "SNS:GetTopicAttributes",
                "SNS:SetTopicAttributes",
                "SNS:AddPermission",
                "SNS:RemovePermission",
                "SNS:DeleteTopic",
                "SNS:Subscribe",
                "SNS:ListSubscriptionsByTopic",
                "SNS:Publish",
                "SNS:Receive"
            ],
            effect: Effect.ALLOW,
            resources: [snsTopicDestinationDLQAlert.topicArn],
            principals: [new ArnPrincipal("*")],
            conditions: {
                "StringEquals": {
                    "aws:SourceOwner": parameters.context.config.AccountID
                }
            }
        })

        const snsTopicPolicyDestinationDLQAlertPolicyStatement1 = new PolicyStatement({
            actions: [
                "SNS:Publish",
            ],
            effect: Effect.ALLOW,
            resources: [snsTopicDestinationDLQAlert.topicArn],
            principals: [new ServicePrincipal("cloudwatch.amazonaws.com")],
        })

        snsTopicPolicyDestinationDLQAlert.document.addStatements(snsTopicPolicyDestinationDLQAlertPolicyStatement);
        snsTopicPolicyDestinationDLQAlert.document.addStatements(snsTopicPolicyDestinationDLQAlertPolicyStatement1);



        // cloudwatch alarm -1

        const destinationValidationmetric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensions: {
                QueueName: destinationValidationDeadLetterQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Average",
        });

        const destinationValidationDeadLetterQueueMessageAlarm = new cloudwatch.Alarm(this,"DestinationValidationDeadLetterQueueMessageAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationValidationDeadLetterQueueMessageAlarm",
            alarmDescription:"A message was sent on the destination publishing validation error queue",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:0,
            treatMissingData: TreatMissingData.MISSING,
            metric: destinationValidationmetric,
        });

        destinationValidationDeadLetterQueueMessageAlarm.addAlarmAction(new SnsAction(snsTopicDestinationDLQAlert))


        // cloudwatch alarm - 2

        const durationAlarmmetric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensions: {
                QueueName: destinationSubmissionDeadLetterQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Maximum",
        });

        const destinationSubmissionDeadLetterQueueMessageAlarm = new cloudwatch.Alarm(this,"DestinationSubmissionDeadLetterQueueMessageAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationSubmissionDeadLetterQueueMessageAlarm",
            alarmDescription:"A message was sent on the destination publishing submission error queue",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:0,
            treatMissingData: TreatMissingData.MISSING,
            metric: durationAlarmmetric,
        });

        destinationSubmissionDeadLetterQueueMessageAlarm.addAlarmAction(new SnsAction(snsTopicDestinationDLQAlert))


        // cloudwatch alarm - 3

        const destinationTaggingmetric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateNumberOfMessagesVisible",
            dimensions: {
                QueueName: destinationTaggingDeadLetterQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Maximum",
        });

        const destinationTaggingDeadLetterQueueMessageAlarm = new cloudwatch.Alarm(this,"DestinationTaggingDeadLetterQueueMessageAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationTaggingDeadLetterQueueMessageAlarm",
            alarmDescription:"A message was sent on the destination publishing tagging error queue",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:0,
            treatMissingData: TreatMissingData.MISSING,
            metric: destinationTaggingmetric,
        });

        destinationTaggingDeadLetterQueueMessageAlarm.addAlarmAction(new SnsAction(snsTopicDestinationDLQAlert))


        // cloudwatch alarm - 4

        const destinationValidationDurationmetric = new cloudwatch.Metric({
            namespace: "AWS/SQS",
            metricName: "ApproximateAgeOfOldestMessage",
            dimensions: {
                QueueName: destinationValidationQueue.queueName
            },
            period: cdk.Duration.minutes(60),
            statistic: "Maximum",
        });

        const destinationValidationDuratonAlarm = new cloudwatch.Alarm(this,"DestinationValidationDuratonAlarm",{
            alarmName: ProjectName + "-" + ProjectEnvironment + "-" + ReleaseGroup + "-DestinationValidationDuratonAlarm",
            alarmDescription:"A destination publishing validation message exceeded 12 hours in duration",
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods:1,
            threshold:0,
            treatMissingData: TreatMissingData.MISSING,
            metric: destinationValidationDurationmetric,
        });

        destinationValidationDuratonAlarm.addAlarmAction(new SnsAction(snsTopicDestinationDLQAlert))
    }
}


