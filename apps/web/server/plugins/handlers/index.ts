import { registerHandler } from "../runtime";
import { qmdSearchHandler } from "./qmd-search";
import { ftsSearchHandler } from "./fts-search";
import { googleDriveHandler } from "./google-drive";

export function registerBuiltinHandlers(): void {
  registerHandler(qmdSearchHandler);
  registerHandler(ftsSearchHandler);
  registerHandler(googleDriveHandler);
}

// Auto-register on import
registerBuiltinHandlers();
