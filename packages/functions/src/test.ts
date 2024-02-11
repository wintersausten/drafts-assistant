import { APIGatewayProxyEvent } from "aws-lambda";

export async function main(event: APIGatewayProxyEvent) {
  return {
    statusCode: 200,
    body: "helloooo",
  };
}
