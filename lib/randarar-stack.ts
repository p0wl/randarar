import * as cdk from "@aws-cdk/core";
import * as nodeLambda from "@aws-cdk/aws-lambda-nodejs";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as route53 from "@aws-cdk/aws-route53";
import * as targets from "@aws-cdk/aws-route53-targets";
import * as acm from "@aws-cdk/aws-certificatemanager";

export class RandararStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new RandararService(this, "RandararService");
  }
}

class RandararService extends cdk.Construct {
  private hostedZoneName = "salmo.link";
  private domain = "p.salmo.link";

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
    const renderer = new nodeLambda.NodejsFunction(this, "RandararRenderer", {
      entry: "./lambda/render/index.ts",
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        environment: {
          SHARP_IGNORE_GLOBAL_LIBVIPS: "1",
        },
        nodeModules: ["sharp", "got"],
        forceDockerBundling: true,
        commandHooks: {
          afterBundling: (inputDir: string, outputDir: string): string[] => [
            `cp -r ${inputDir}/lambda/render/fonts ${outputDir}/fonts`,
          ],
          beforeBundling: () => [],
          beforeInstall: () => [],
        },
      },
      environment: {
        FONTCONFIG_FILE: "/var/task/fonts/fonts.conf",
      },
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          "aws-lambda-fonts",
          "arn:aws:lambda:us-east-1:347599033421:layer:amazon_linux_fonts:1"
        ),
      ],
    });

    const salmoHostedZone = route53.HostedZone.fromLookup(
      this,
      this.hostedZoneName,
      {
        domainName: this.hostedZoneName,
      }
    );

    const certificate = new acm.Certificate(this, "PreviewCertificate", {
      domainName: this.domain,
      validation: acm.CertificateValidation.fromDns(salmoHostedZone),
    });

    const api = new apigateway.LambdaRestApi(this, "randarar", {
      handler: renderer,
      binaryMediaTypes: ["*/*"],
      domainName: {
        domainName: this.domain,
        certificate: certificate,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
    });

    new route53.ARecord(this, "CustomDomainAliasRecord", {
      zone: salmoHostedZone,
      recordName: this.domain,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
    });

    new cdk.CfnOutput(this, "API", {
      value: api.url,
    });
  }
}
