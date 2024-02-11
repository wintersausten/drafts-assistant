import { Table } from "sst/node/table";
import handler from "@drafts-assistant/core/handler"
import dynamoDb from "@drafts-assistant/core/dynamoDb"
import { isValidISOString, updateDataParams } from "@drafts-assistant/core/utils";

export const getAll = handler(async() => {
  const params = {
      TableName: Table.DraftsAssistantData.tableName,
      KeyConditionExpression: "userId = :userId AND begins_with(typeAndTimestamp, :type)",
      ExpressionAttributeValues: {
        ":userId": "abw",
        ":type": "rule",
      }
  }

  const result = await dynamoDb.query(params);

  if (result.Items === undefined) {
    throw new Error("Query for rules failed")
  }

  return JSON.stringify(result.Items);
});

export const create = handler(async (event) => {
  let data, params;

  if (event.body != null) {
    data = JSON.parse(event.body);
  }
  const ruleData = {
    id: data.id,
    type: data.type,
    parameters: data.parameters,
    priority: data.priority,
  };

  params = {
    TableName: Table.DraftsAssistantData.tableName,
    Item: {
      userId: "abw",
      typeAndTimestamp: `rule#${new Date().toISOString()}`,
      data: ruleData,
    }
  };

  await dynamoDb.put(params);
  
  return JSON.stringify(params.Item);
});

export const update = handler(async (event) => {
  let data, params;
  if (event.body != null) {
    data = JSON.parse(event.body);
  }

  const timestamp = event?.pathParameters?.timestamp;
  if (!timestamp || !isValidISOString(timestamp)) {
    throw new Error("Invalid entry in required timestamp field")
  }

  params = {
    TableName: Table.DraftsAssistantData.tableName,
    Key: {
      userId: "abw",
      typeAndTimestamp: `rule#${timestamp}`,
    },
    UpdateExpression: "SET",
    ExpressionAttributeNames: {} as Record<string, string>,
    ExpressionAttributeValues: {} as Record<string, any>,
  };

  updateDataParams(params, data);

  await dynamoDb.update(params);

  return JSON.stringify({ success: true });
});

export const remove = handler(async (event) => {
  const timestamp = event?.pathParameters?.timestamp;
  if (!timestamp || !isValidISOString(timestamp)) {
    throw new Error("Invalid entry in required timestamp field")
  }

  const params = {
    TableName: Table.DraftsAssistantData.tableName,
    Key: {
      userId: "abw", 
      typeAndTimestamp: `rule#${timestamp}`,
    },
  };

  await dynamoDb.delete(params);

  return JSON.stringify({ success: true });
});

