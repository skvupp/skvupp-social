import { Tap, SimpleIndexer } from "@atproto/tap";
import type { RecordEvent, IdentityEvent, HandlerOpts } from "@atproto/tap";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "webhook-url": { type: "string" },
    "collection-filters": { type: "string", multiple: true },
    "signal-collection": { type: "string" },
    "tap-url": { type: "string", default: "https://eurosky.social" },
  },
  allowPositionals: true,
});

const command = positionals[0];
const webhookUrl = values["webhook-url"];
const tapUrl = values["tap-url"];
const TAP_ADMIN_PASSWORD = process.env.TAP_ADMIN_PASSWORD;

if (command !== "run" || !webhookUrl) {
  console.error("Usage: tap run --webhook-url=<url> [--collection-filters=<coll>] [--signal-collection=<coll>] [--tap-url=<url>]");
  process.exit(1);
}

const tap = new Tap(tapUrl!, {
  adminPassword: TAP_ADMIN_PASSWORD,
});

const indexer = new SimpleIndexer();

const forward = async (evt: RecordEvent | IdentityEvent, opts?: HandlerOpts) => {
  console.log(`Forwarding ${evt.type} event ${evt.id} to ${webhookUrl}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (TAP_ADMIN_PASSWORD) {
    // Basic auth as expected by our webhook implementation
    headers["Authorization"] = `Basic ${Buffer.from(`admin:${TAP_ADMIN_PASSWORD}`).toString("base64")}`;
  }

  try {
    const resp = await fetch(webhookUrl!, {
      method: "POST",
      headers,
      body: JSON.stringify(evt),
    });

    if (!resp.ok) {
      console.error(`Webhook failed with status ${resp.status}: ${await resp.text()}`);
    } else {
      await opts?.ack();
    }
  } catch (err) {
    console.error(`Failed to forward event: ${err}`);
  }
};

indexer.record(forward);
indexer.identity(forward);

indexer.error((err) => {
  console.error("TAP error:", err);
});

console.log(`Starting TAP client connecting to ${tapUrl}...`);
const channel = tap.channel(indexer);
channel.start().catch((err) => {
  console.error("TAP channel error:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  channel.destroy().then(() => process.exit(0));
});
