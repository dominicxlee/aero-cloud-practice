import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class AeroCloudPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const flightFunction = new lambda.Function(this, 'FlightStatusFunction', {
      description: 'Returns the current status of an airport flight',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async () => {
          return {
            statusCode: 200,
            body: JSON.stringify({
              flight: "AC101",
              status: "Boarding"
            })
          };
        };
      `),
    });
  }
}