let client: any = null;

async function getClient(): Promise<any> {
  if (!client) {
    // Dynamic import — @renderinc/sdk is only installed when a workflow
    // backend is configured. Using a variable prevents TypeScript from
    // resolving the module at compile time.
    const sdkModule = "@renderinc/sdk";
    const { Render } = await import(/* webpackIgnore: true */ sdkModule);
    client = new Render();
  }
  return client;
}

function slug(): string {
  return process.env.RENDER_WORKFLOW_SLUG!;
}

export async function dispatchSyncWorkspace(params: {
  runId: string;
  workspaceId: string;
  targetStoreId?: string;
  triggeredByUserId?: string;
}): Promise<{ taskRunId: string }> {
  const render = await getClient();
  const started = await render.workflows.startTask(
    `${slug()}/syncWorkspace`,
    [
      params.runId,
      params.workspaceId,
      params.targetStoreId ?? null,
      params.triggeredByUserId ?? null,
    ],
  );
  return { taskRunId: started.taskRunId };
}
