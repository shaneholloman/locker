import { runtime } from "../runtime-context";

export function shouldDelegateToWorkflow(): boolean {
  if (runtime.longRunningSupported) return false;
  return runtime.taskQueueAvailable;
}
