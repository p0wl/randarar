import * as cdk from "@aws-cdk/core";
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";

export class RandararStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new RandararService(this, "RandararService");
  }
}

class RandararService extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
    const renderer = new nodeLambda.NodejsFunction(this, "RandararRenderer", {
      entry: "./lambda/render/index.ts",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        nodeModules: ["sharp", "got"],
        forceDockerBundling: true,
      },
    });
    const api = new apigateway.LambdaRestApi(this, "randarar", {
      handler: renderer,
      binaryMediaTypes: ['*/*'],
    });

    new cdk.CfnOutput(this, "API", {
      value: api.url,
    });
  }
}
