import { StackContext, Table } from "sst/constructs";

export function StorageStack({ stack }: StackContext) {
  const table = new Table(stack, "DraftsAssistantData", {
    fields: {
      userId: "string",
      typeAndTimestamp: "string",
      data: "string",
    }, 
    primaryIndex: { partitionKey: "userId", sortKey: "typeAndTimestamp" },
  });

  return {
    table,
  }
}
