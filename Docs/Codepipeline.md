# Deployment Strategy

We are using code pipeline for continuous deployment which will do the build process and after that it will run the cloudformation stacks using CDK for creating the AWS resources.

## Creating code pipeline

### prerequiste

1. Create SNS with subscription as mail to recieve the approval mail during deployment.

### Steps to create code pipeline manually

1. First create the code pipeline with the source as github and connect to github using OAuth option which is available in code pipeline. Then choose your reporsitory and branch. Role will created automatically otherwise choose the existing role . Make sure to  attach/create appropriate policies for the IAM role created for the code pipeline

2. Next step is Build Stage . Here we need to choose the build provider as AWS Code build . If you have existing code build project select from the drop down or else click on create project  

    * Give project name and description
    * In the environment section , choose `AWS Managed image`.
    * From the operating system , choose `Ubuntu`
    * Run Time as `Standard`
    * Image as `aws/codebuild/standard:5.0`
    * Image version as always use the latest image
    * Environment type as `linux`
    * Select the privileaged checkbox
    *  Role will created automatically otherwise choose the existing role . Make sure to  attach/create appropriate policies for the IAM role created for the code build
    * In the build spec section , choose Insert build commands and click on switch to editor and then copy the code from `buildspec-test.yaml` file from the root folder.
    * Click on continue to code pipeline

3. As of now , Click on skip deploy stage .

    Now you have configured your code pipeline for your repo with two stages .One is source and another one is build.Now you need to include the another two more stages like Approval and deploy.

4. Click on Edit in code pipeline , in the below, click on Add stage and name it is Approval . Then click on Add action group  in the approval stage.
    
    * Give `approval` as action name
    * Action provider as `Manual Approval`
    * Choose the SNS topic you have created for receiving emails
    * click on done

5. Again Now in the code pipeline, click on Add stage and name it is Deploy . Then click on Add action group  in the Deploy stage.

    * Give `deploy` as action name
    * Action provider as `AWS Code build`
    * Input Artifact as `Source artifact`
    * If you have existing code build project select from the drop down or else click on create project  
    * Give project name and description
    * In the environment section , choose `AWS Managed image`.
    * From the operating system , choose `Ubuntu`
    * Run Time as `Standard`
    * Image as `aws/codebuild/standard:5.0`
    * Image version as always use the latest image
    * Environment type as `linux`
    * Select the privileaged checkbox
    *  Role will created automatically otherwise choose the existing role . Make sure to  attach/create appropriate policies for the IAM role created for the code build
    * In the build spec section , choose Insert build commands and click on switch to editor and then copy the code from `buildspec.yaml` file from the root folder.
    * Click on continue to code pipeline.
    * click on done
6. Now click on save in the code pipeline . Your code pipeline is ready with 4 stages .

    - Source
    - Build
    - Approval
    - Deploy