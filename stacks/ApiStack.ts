import { Api, StackContext, Function, use } from "sst/constructs";
import { StorageStack } from "./StorageStack"

export function ApiStack({ stack }: StackContext) {
  const { table } = use(StorageStack);

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [table],
      }
    },
    routes: {
      // Rules
      "GET /rules": "packages/functions/src/rules.getAll",
      "POST /rules": "packages/functions/src/rules.create",
      "PUT /rules/{timestamp}": "packages/functions/src/rules.update",
      "DELETE /rules/{timestamp}": "packages/functions/src/rules.remove",

      // Drafts
      // Hiding these endpoints until their necessary - they may not need to be exposed at all
      // "POST /drafts": "packages/functions/src/drafts.create",
      // "GET /drafts": "packages/functions/src/drafts.getAll",
      // "PUT /drafts/{timestamp}": "packages/functions/src/drafts.update",
      // "DELETE /drafts/{timestamp}": "packages/functions/src/drafts.remove",
      "GET /drafts/next": "packages/functions/src/drafts.getNext",
      "GET /drafts/outbox": "packages/functions/src/drafts.getOutbox",
      "POST /drafts/dump": "packages/functions/src/drafts.dump",
    }
  });

  // standalone function that gets invoked by the draft dump
  const generateSuggestion = new Function(stack, "GenerateSuggestion", {
    handler: "packages/functions/src/drafts.generateSuggestion",
  })
  api.attachPermissionsToRoute("POST /drafts/dump", [generateSuggestion]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return {
    api,
  }
}
