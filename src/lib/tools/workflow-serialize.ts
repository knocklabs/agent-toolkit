import { Workflow, WorkflowStep } from "@knocklabs/mgmt/resources/index.js";

/**
 * A slimmed down version of the Workflow resource that is easier to work with in the LLM.
 */
export type SerializedWorkflow = {
  key: string;
  name: string;
  description: string | undefined;
  categories: string[] | undefined;
  schema: Record<string, unknown> | undefined;
};

export function serializeWorkflowResponse(
  workflow: Workflow
): SerializedWorkflow {
  return {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    categories: workflow.categories,
    schema: workflow.trigger_data_json_schema,
  };
}

export function serializeFullWorkflowResponse(
  workflow: Workflow
): SerializedWorkflow & { steps: WorkflowStep[] } {
  return {
    key: workflow.key,
    name: workflow.name,
    description: workflow.description,
    categories: workflow.categories,
    schema: workflow.trigger_data_json_schema,
    steps: workflow.steps,
  };
}
