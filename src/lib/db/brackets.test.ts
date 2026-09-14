import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PLAYOFF_SEASON_YEAR } from "@/data/teams";
import { createInitialBracket } from "@/lib/playoff-rules";
import {
  createBracket,
  deleteBracket,
  getBracket,
  getSharedBracket,
  listBrackets,
  publishBracket,
  unpublishBracket,
  updateBracket,
} from "./brackets";

(process.env.TEST_DATABASE_URL ? test : test.skip)(
  "account storage isolates owners, rejects stale writes, and revokes public snapshots",
  async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const owner = `test-${randomUUID()}`;
    const otherOwner = `test-${randomUUID()}`;
    const document = {
      seasonYear: PLAYOFF_SEASON_YEAR,
      state: createInitialBracket("Public name"),
    };
    let current = await createBracket(owner, document);
    try {
      assert.equal((await listBrackets(otherOwner)).brackets.length, 0);
      await assert.rejects(getBracket(otherOwner, current.id), { status: 404 });
      await assert.rejects(updateBracket(otherOwner, current.id, 1, document), { status: 404 });
      await assert.rejects(deleteBracket(otherOwner, current.id, 1), { status: 404 });
      await assert.rejects(publishBracket(otherOwner, current.id, 1), { status: 404 });
      await assert.rejects(unpublishBracket(otherOwner, current.id, 1), { status: 404 });
      assert.equal(current.shareToken, null);
      current = await updateBracket(owner, current.id, 1, {
        ...document,
        state: { ...document.state, name: "Updated" },
      });
      assert.equal(current.revision, 2);
      await assert.rejects(updateBracket(owner, current.id, 1, document), { status: 409 });
      assert.equal(
        (await createBracket(owner, document)).state.name,
        "Updated",
        "retrying an import never overwrites edits",
      );
      current = await publishBracket(owner, current.id, current.revision);
      const oldToken = current.shareToken!;
      assert.equal((await getSharedBracket(oldToken)).state.name, "Updated");
      current = await updateBracket(owner, current.id, current.revision, document);
      assert.equal(
        (await getSharedBracket(oldToken)).state.name,
        "Updated",
        "private edits do not change the public snapshot",
      );
      current = await unpublishBracket(owner, current.id, current.revision);
      await assert.rejects(getSharedBracket(oldToken), { status: 404 });
      current = await publishBracket(owner, current.id, current.revision);
      assert.notEqual(
        current.shareToken,
        oldToken,
        "revoked links stay revoked after sharing again",
      );
    } finally {
      await deleteBracket(owner, current.id, current.revision);
    }
  },
);
