import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { AeroCloudPracticeStack } from "../lib/aero-cloud-practice-stack";

describe("AeroCloudPracticeStack", () => {
  const app = new cdk.App();
  const stack = new AeroCloudPracticeStack(app, "TestStack");

  const template = Template.fromStack(stack);

  test("creates an SQS queue", () => {
    template.resourceCountIs("AWS::SQS::Queue", 2);
  });

  test("configures the flight queue with a dead letter queue", () => {
    template.hasResourceProperties("AWS::SQS::Queue", {
      VisibilityTimeout: 30,
      RedrivePolicy: {
        maxReceiveCount: 3,
      },
    });
  });

  test("creates the flight worker Lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
    });
  });

  test("creates the DLQ alarm", () => {
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      Threshold: 1,
      EvaluationPeriods: 1,
    });
  });

  test("creates the API Gateway", () => {
    template.resourceCountIs("AWS::ApiGateway::RestApi", 1);
  });
});