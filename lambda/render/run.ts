import { writeFileSync } from "fs";

const handler = require("./index").handler;

const apiEvent = {
  queryStringParameters: {
    s: "http://localhost:8080/onruby_share.svg",
    title: "Ruby Usergroup Berlin - February 2021",
    subtitle: "hosted by Tobias Pfeiffer",
    date: "04.02.2021 at 19:00",
    participants: "31",
    logo:
      "https://www.rug-b.de/assets/labels/berlin-7e15291064be58fb05a3fa205fde8becf8d53d179a14c6b447c23ce9e61ccc49.png",
    logo2:
      "https://hamburg.onruby.de/assets/labels/hamburg-b38fc9aa8aea505fcfe49a9032684ec70dbaab11071a4e9aeea2bf55695cdd3f.png",
  },
};

async function run() {
  console.time("run");
  const response = await handler(apiEvent, { awsRequestId: "local" });
  console.timeEnd("run");
  writeFileSync("output.png", response.body, "base64");
  console.log("done");
}
run();
