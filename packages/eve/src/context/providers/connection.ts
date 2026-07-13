import { ConnectionRegistryKey } from "#context/providers/connection-key.js";
import { ConnectionRegistryImpl } from "#runtime/connections/registry.js";
import type {
  ConnectionRegistry,
  ResolvedConnectionDefinition,
} from "#runtime/connections/types.js";
import { BundleKey } from "#runtime/sessions/runtime-context-keys.js";
import { getActiveRuntimeNode } from "#context/node.js";
import type { FrameworkContextProvider } from "#context/provider.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export { ConnectionRegistryKey } from "#context/providers/connection-key.js";

export const connectionProvider: FrameworkContextProvider<ConnectionRegistry> = {
  key: ConnectionRegistryKey,

  create(ctx, _session) {
    const bundle = ctx.get(BundleKey);
    if (bundle === undefined) return undefined;
    const node = getActiveRuntimeNode(ctx);
    const connections = node.agent?.connections;
    if (!connections || connections.length === 0) return undefined;

    // Per-session: filter to only enabled connections
    const filtered = filterEnabled(node.agent?.metadata?.agentRoot, connections);
    if (filtered.length === 0) return undefined;

    return { value: new ConnectionRegistryImpl(filtered) };
  },
};

function filterEnabled(
  agentRoot: string | undefined,
  connections: readonly ResolvedConnectionDefinition[],
): readonly ResolvedConnectionDefinition[] {
  if (!agentRoot) return connections;
  try {
    const filePath = join(agentRoot, "enabled-connections.json");
    if (!existsSync(filePath)) return connections;
    const raw = readFileSync(filePath, "utf8");
    const list = JSON.parse(raw) as string[];
    if (!Array.isArray(list)) return connections;
    return connections.filter((c) => list.includes(c.connectionName));
  } catch {
    return connections;
  }
}
