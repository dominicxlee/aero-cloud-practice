import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class AeroCloudPracticeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const alarmTopic = new sns.Topic(this, 'FlightStatusAlarmTopic', {
  displayName: 'Flight Status Lambda Alerts',
});


alarmTopic.addSubscription(
  new subscriptions.EmailSubscription('kaydenxlee@gmail.com')
);

const flightQueue = new sqs.Queue(this, 'FlightUpdateQueue', {
  visibilityTimeout: cdk.Duration.seconds(30),
});

    const flightFunction = new lambda.Function(this, 'FlightStatusFunction', {
      environment: {
      SIMULATE_FAILURE: "false",
      FLIGHT_QUEUE_URL: flightQueue.queueUrl,
      },
      description: 'Returns the current status of an airport flight for airport operations',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
  const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

  const sqs = new SQSClient({});

  exports.handler = async (event) => {
    const flightNumber = event.pathParameters?.flightNumber || "unknown";

    console.log("Flight status lookup started", {
      flight: flightNumber
    });

    const flightStatuses = {
      AC101: "Boarding",
      BA202: "Delayed",
      EK303: "Departed"
    };

    const status = flightStatuses[flightNumber] || "Scheduled";

    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.FLIGHT_QUEUE_URL,
      MessageBody: JSON.stringify({
        flight: flightNumber,
        status
      })
    }));

    console.log("Flight update queued", {
      flight: flightNumber,
      status
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        flight: flightNumber,
        status
      })
    };
  };
`),
    });
    flightQueue.grantSendMessages(flightFunction);

    const flightWorkerFunction = new lambda.Function(this, 'FlightWorkerFunction', {
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    exports.handler = async (event) => {
      console.log("Flight worker started");

      for (const record of event.Records) {
        const message = JSON.parse(record.body);

        console.log("Processing flight update", {
        flight: message.flight,
        status: message.status
      });
      }

      console.log("Flight worker finished");
    };
  `),
});
   flightWorkerFunction.addEventSource(
  new lambdaEventSources.SqsEventSource(flightQueue)
);

    const flightFunctionErrorAlarm = new cloudwatch.Alarm(
  this,
  'FlightFunctionErrorAlarm',
  {
    alarmDescription: 'Alerts when the flight status Lambda reports an error',
    metric: flightFunction.metricErrors({
      period: cdk.Duration.minutes(1),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  }
);
flightFunctionErrorAlarm.addAlarmAction(
  new cloudwatchActions.SnsAction(alarmTopic)
);
const api = new apigateway.LambdaRestApi(this, 'FlightStatusApi', {
  handler: flightFunction,
  proxy: false,
});

const flights = api.root.addResource('flights');
flights.addResource('{flightNumber}').addMethod('GET');
  }
}