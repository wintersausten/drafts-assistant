import { Table } from "sst/node/table";
import handler from "@drafts-assistant/core/handler"
import dynamoDb from "@drafts-assistant/core/dynamoDb"
import { isValidISOString, updateDataParams } from "@drafts-assistant/core/utils"
import { LambdaClient, InvokeCommand } from "aws-sdk/clients/lambda";

const lambdaClient = new LambdaClient({ region: "us-west-1"})

export const getAll = handler(async () => {
  const params = {
      TableName: Table.DraftsAssistantData.tableName,
      KeyConditionExpression: "userId = :userId AND begins_with(typeAndTimestamp, :type)",
      ExpressionAttributeValues: {
        ":userId": "abw",
        ":type": "draft#",
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

  const draftData =  {
    id: data.id,
    title: data.title,
    content: data.content,
    tags: data.tags,
    state: DraftState.PENDING,
  };

  params = {
    TableName: Table.DraftsAssistantData.tableName,
    Item: {
      userId: "abw",
      typeAndTimestamp: `draft#${new Date().toISOString()}`,
      data: draftData,
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
      typeAndTimestamp: `draft#${timestamp}`,
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
      typeAndTimestamp: `draft#${timestamp}`,
    },
  };

  await dynamoDb.delete(params);

  return JSON.stringify({ success: true });
});

export const getNext = handler(async () => {
  const params = {
    TableName: Table.DraftsAssistantData.tableName,
    KeyConditionExpression: 'userId = :userIdValue AND begins_with(typeAndTimestamp, :typeValue)',
    FilterExpression: '#data.#state = :stateValue',
    ExpressionAttributeValues: {
      ':userIdValue': 'abw',
      ':typeValue': 'draft#',
      ':stateValue': DraftState.PENDING,
    },
    ExpressionAttributeNames: {
      '#data': 'data',
      '#state': 'state'
    },
    ScanIndexForward: true,
  };

  const result = await dynamoDb.query(params);
  if (result.Items === undefined) {
    throw new Error("Query for rules failed")
  }

  return result.Items.length > 0 ? JSON.stringify(result.Items[0]) : "null";
});

export const getOutbox = handler(async () => {
  const params = {
    TableName: Table.DraftsAssistantData.tableName,
    KeyConditionExpression: 'userId = :userIdValue AND begins_with(typeAndTimestamp, :typeValue)',
    FilterExpression: '#data.#state = :stateValue',
    ExpressionAttributeValues: {
      ':userIdValue': 'abw',
      ':typeValue': 'draft#',
      ':stateValue': DraftState.OUTBOX,
    },
    ExpressionAttributeNames: {
      '#data': 'data',
      '#state': 'state'
    },
  };

  const result = await dynamoDb.query(params);
  if (result.Items === undefined) {
    throw new Error("Query for rules failed")
  }

  return JSON.stringify(result.Items);
});

export const generateSuggestion = async (event) => {
  const { userId, typeAndTimestamp } = event;
  try {
    // Get draft data from table
    const getDraftParams = {
      TableName: Table.DraftsAssistantData.tableName,
      Key: {
        userId,
        typeAndTimestamp
      },
    };
    const draft = await dynamoDb.get(getDraftParams);

    // Generate suggestion through rule engine
    const runRuleEngineParams = {
      FunctionName: "runRuleEngine",
      InvicationType: "RequestResponse",
      Payload: JSON.stringify(draft),
    };
    const runRuleEngineCommand = new InvokeCommand(runRuleEngineParams);
    const response = await lambdaClient.send(runRuleEngineCommand);
    const suggestion = JSON.parse(new TextDecoder().decode(response.Payload));

    // Update draft with suggestion
    const updateDraftParams = {
      TableName: Table.DraftsAssistantData.tableName,
      Key: {
        userId,
        typeAndTimestamp
      },
      UpdateExpression: "SET #data.#suggestion = :suggestion",
      ExpressionAttributeNames: {
        "#data": "data",
        "#suggestion": "suggestion",
      },
      ExpressionAttributeValues: {
        ":suggestion": suggestion
      },
    };
    await dynamoDb.update(updateDraftParams);

    console.log(`Successfully generated suggestion for draft with sortKey ${typeAndTimestamp}`);
  } catch (error) {
    console.error(`Error generating suggestion for draft with sortKey ${typeAndTimestamp}`);
  }
}

enum DraftState {
  PENDING = 'pending', // pending user decision
  OUTBOX = 'outbox', // decision made, ready to be pulled
}

