import sharp from "sharp";
import got from "got";
import Mustache from "mustache";
import { APIGatewayProxyHandler } from "aws-lambda";

const handler: APIGatewayProxyHandler = async (event) => {
  const source = event.queryStringParameters!.s!;
  const placeholders = event.queryStringParameters!;
  delete placeholders.s;

  assertPlaceholders(placeholders);
  console.log("rendering", source);

  console.time("download");
  const imageBuffer = await downloadImageAsBuffer(source);
  console.timeEnd("download");

  console.time("replace");
  const replaced = replacePlaceholders(imageBuffer, placeholders);
  console.log("replaced", imageBuffer, replaced);
  console.timeEnd("replace");

  console.time("sharp");
  const result = await sharp(Buffer.from(replaced), { density: 300 })
    .png()
    .toBuffer();
  console.timeEnd("sharp");

  return {
    body: result.toString("base64"),
    statusCode: 200,
    headers: {
      "Content-Type": "image/png; charset=utf-8",
    },
    isBase64Encoded: true,
  };
};

const downloadImageAsBuffer = async (url: string) => {
  const response = await got(url, { responseType: "text" });
  return response.body;
};

const assertPlaceholders = (placeholders: Record<string, unknown>) => {
  Object.keys(placeholders).forEach((k) => {
    if (typeof placeholders[k] !== "string") {
      console.error("unsupported placeholder", k, placeholders[k]);
      throw new Error("found placeholder that is not a string, unsupported");
    }
  });
};

const replacePlaceholders = (
  original: string,
  placeholders: Record<string, string | undefined>
) => {
  return Mustache.render(original, placeholders);
};

module.exports.handler = handler;
