import { ToolInvocation } from "@ai-sdk/ui-utils";

import { DeferredToolCall } from "@/lib/human-in-the-loop/types";

/**
 * Convert a deferred tool call to a tool invocation. Useful when building an assistant
 * response from a deferred tool call.
 *
 * @param deferredToolCall - The deferred tool call to convert.
 * @param result - The result of the tool call.
 * @returns The tool invocation.
 */
function deferredToolCallToToolInvocation(
  deferredToolCall: DeferredToolCall,
  result: unknown
): ToolInvocation {
  return {
    args: deferredToolCall.args,
    toolName: deferredToolCall.method,
    toolCallId: deferredToolCall.extra?.toolCallId as string,
    state: "result",
    step: 0,
    result,
  };
}

export { deferredToolCallToToolInvocation };
