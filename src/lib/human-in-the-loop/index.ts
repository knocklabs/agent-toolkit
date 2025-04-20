import { Config } from "@/types";

import { KnockClient } from "../knock-client";

import {
  DeferredToolCallWorkflowData,
  DeferredToolCallConfig,
  KnockOutboundWebhookEvent,
  DeferredToolCall,
  DeferredToolCallInteractionResult,
} from "./types";
/**
 * Triggers a human in the loop workflow.
 *
 * @param knockClient - The Knock client to use.
 * @param toolCall - The tool call to trigger.
 * @param config - The configuration to use.
 */
async function triggerHumanInTheLoopWorkflow({
  knockClient,
  config,
  toolCall,
  inputConfig,
}: {
  knockClient: KnockClient;
  config: Config;
  toolCall: DeferredToolCall;
  inputConfig: DeferredToolCallConfig;
}) {
  const knock = await knockClient.publicApi(config.environment);

  const result = await knock.workflows.trigger(inputConfig.workflow, {
    data: {
      tool_call: toolCall,
      metadata: inputConfig.metadata,
    } as DeferredToolCallWorkflowData,
    recipients: inputConfig.recipients,
    tenant: inputConfig.tenant,
    actor: inputConfig.actor,
  });

  return result;
}

/**
 * Given an outboundwebhook event, this function will parse the event into a normalized format.
 *
 * If the event is not associated with a deferred tool call, this function will return null.
 *
 * @param event - The outbound webhook event
 * @returns A deferred tool call interaction result, or null if the event is not a deferred tool call
 */
function handleMessageInteraction(
  event: KnockOutboundWebhookEvent
): DeferredToolCallInteractionResult | null {
  const { data: message } = event;

  // We only care about message.interacted events
  if (event.type !== "message.interacted") {
    return null;
  }

  // We only care about messages that contain a tool call
  if (message.data.type !== "deferred_tool_call" || !message.data.tool_call) {
    return null;
  }

  const messageData = message.data as DeferredToolCallWorkflowData;

  return {
    workflow: message.source.key,
    interaction: event.event_data,
    toolCall: {
      method: messageData.tool_call.method,
      args: messageData.tool_call.args,
      extra: messageData.tool_call.extra,
    },
    metadata: messageData.metadata,
    context: {
      messageId: message.id,
      channelId: message.channel_id,
      timestamp: event.created_at,
    },
  };
}

export { handleMessageInteraction, triggerHumanInTheLoopWorkflow };
