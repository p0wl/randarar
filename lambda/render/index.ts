import { URL } from "url";
import { extname } from "path";
import sharp from "sharp";
import got from "got";
import Mustache from "mustache";
import { APIGatewayProxyHandler } from "aws-lambda";

const handler: APIGatewayProxyHandler = async (event) => {
  console.log("requested-path", event.path);
  console.log(JSON.stringify(event));

  if (event.path !== "/render.png") {
    return {
      body: "Nothing here",
      statusCode: 400,
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      body: "Nothing here",
      statusCode: 400,
    };
  }

  const source = event.queryStringParameters!.s!;
  const dpi = event.queryStringParameters!.dpi;
  const sourcePlaceholders = event.queryStringParameters!;
  delete sourcePlaceholders.s;

  let density = 144;
  if (dpi && !isNaN(density)) {
    density = parseInt(dpi);
    delete sourcePlaceholders.dpi;
  }

  let placeholders: Record<string, string | undefined> = sourcePlaceholders;

  try {
    assertPlaceholders(placeholders);
  } catch (e) {
    return {
      body: "",
      statusCode: 400,
    };
  }
  console.log("rendering", JSON.stringify(event));

  console.time("download");
  const imageBuffer = await downloadImageAsText(source);
  console.timeEnd("download");

  console.time("downloadPlaceholderImages");
  placeholders = await downloadPlaceholderImages(placeholders);
  console.timeEnd("downloadPlaceholderImages");

  console.time("replace");
  const replaced = replacePlaceholders(imageBuffer, placeholders);
  console.timeEnd("replace");

  console.time("sharp");
  const result = await sharp(Buffer.from(replaced), { density })
    .png()
    .toBuffer();
  console.timeEnd("sharp");

  return {
    body: result.toString("base64"),
    statusCode: 200,
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "image/png; charset=utf-8",
    },
    isBase64Encoded: true,
  };
};

const downloadImageAsText = async (url: string) => {
  const response = await got(url, { responseType: "text" });
  return response.body;
};

const downloadPlaceholderImages = async (
  placeholders: Record<string, string | undefined>
) => {
  const imagePlaceholderKeys = Object.keys(placeholders).filter(
    (p) => placeholders[p] && placeholders[p]?.startsWith("https://")
  );

  const result: Record<string, string | undefined> = { ...placeholders };

  await Promise.all(
    imagePlaceholderKeys.map(async (key) => {
      const url = placeholders[key];
      console.log("downloading placeholder from", url);
      const file = await got(url!, { responseType: "buffer" });
      console.log("downloading placeholder finished", url);
      result[key] = `data:image/png;base64,` + file.body.toString("base64");
    })
  );

  return result;
};

const allowedPlaceholderImageTypes = [".png", ".ico", ".jpg", ".jpeg"];
const assertPlaceholders = (placeholders: Record<string, unknown>) => {
  Object.keys(placeholders).forEach((k) => {
    const value = placeholders[k];
    if (typeof value !== "string") {
      console.error("unsupported placeholder", k, value);
      throw new Error("found placeholder that is not a string, unsupported");
    }

    if (value.startsWith("http")) {
      if (!value.startsWith("https://")) {
        console.error("unsupported url", k, value);
        throw new Error("found placeholder with http url, unsupported");
      }

      const url = new URL(value); // throws if invalid url

      const extension = extname(url.pathname);
      if (!allowedPlaceholderImageTypes.includes(extension)) {
        console.error("unsupported placeholder extension", k, value);
        throw new Error("unsupported placeholder extension");
      }
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
