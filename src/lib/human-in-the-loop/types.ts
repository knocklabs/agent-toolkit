import { Message } from "@knocklabs/node/dist/src/resources/messages/interfaces";

type Metadata = Record<string, unknown> | undefined;

export interface DeferredToolCallWorkflowData {
  type: "deferred_tool_call";
  /**
   * The tool call to trigger.
   */
  tool_call: DeferredToolCall;
  /**
   * Any extra data to pass to the workflow as context.
   */
  metadata?: Metadata;
}

export interface DeferredToolCallConfig {
  /**
   * The workflow to trigger.
   */
  workflow: string;
  /**
   * The recipients to trigger the workflow for.
   */
  recipients: string[];
  /**
   * Any extra data to pass to the workflow as context.
   */
  metadata?: Metadata;
  /**
   * The tenant to trigger the workflow for.
   */
  tenant?: string;
  /**
   * The actor to trigger the workflow for.
   */
  actor?: string;
}

export type DeferredToolCall = {
  /**
   * The method of the tool that was called.
   */
  method: string;
  /**
   * The arguments to pass to the tool.
   */
  args: Record<string, unknown> | undefined;
  /**
   * Any extra options to pass to the tool call. This is required for some providers.
   */
  extra: Record<string, unknown> | undefined;
};

export interface KnockOutboundWebhookEvent {
  /**
   * The type of event.
   */
  type: string;

  /**
   * The timestamp of the event.
   */
  created_at: string;

  /**
   * The underlying message that was generated
   */
  data: Message;

  /**
   * Extra data associated with the event.
   */
  event_data: Record<string, unknown>;
}

export interface DeferredToolCallInteractionResult<
  InteractionData = Record<string, unknown>,
  Metadata = Record<string, unknown>,
> {
  /**
   * The workflow that was triggered.
   */
  workflow: string;
  /**
   * The interaction data.
   */
  interaction: InteractionData;
  /**
   * The tool call.
   */
  toolCall: DeferredToolCall;
  /**
   * The metadata passed with the tool call.
   */
  metadata?: Metadata;
  /**
   * The context of the tool call.
   */
  context: {
    /**
     * The message ID.
     */
    messageId: string;
    /**
     * The channel ID.
     */
    channelId: string;
    /**
     * The timestamp of the event.
     */
    timestamp: string;
  };
}
