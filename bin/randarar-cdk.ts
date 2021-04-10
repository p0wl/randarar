#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { RandararStack } from "../lib/randarar-stack";

const app = new cdk.App();
new RandararStack(app, "RandararStack", { env: { region: "us-east-1" } });
