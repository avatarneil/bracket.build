import { parseArgs } from "node:util";
import { syncHistory } from "../src/lib/ridiculous-stats/sync";

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string" },
    "dry-run": { type: "boolean" },
    help: { type: "boolean" },
  },
  strict: true,
});
if (values.help) {
  console.log(
    "Usage: bun run stats:import [--from 1999] [--to 2025] [--dry-run]\nWithout a range, backfill missing seasons and refresh the latest two. Uses DATABASE_URL. Dry runs make no database connection.",
  );
} else {
  try {
    console.log(
      JSON.stringify(
        await syncHistory({
          from: values.from == null ? undefined : Number(values.from),
          to: values.to == null ? undefined : Number(values.to),
          dryRun: values["dry-run"],
        }),
        null,
        2,
      ),
    );
  } catch {
    console.error(
      "Historical import failed. Check source availability, season arguments, and database configuration. Completed seasons remain saved; rerunning is safe.",
    );
    process.exitCode = 1;
  }
}
