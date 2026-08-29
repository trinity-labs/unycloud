import { describe, expect, it } from "vitest";
import { responseErrorMessage } from "@/api/error";

describe("responseErrorMessage", () => {
  it("does not expose HTML error pages in toasts", async () => {
    const res = new Response(
      "<!doctype html><html><body>forbidden</body></html>",
      {
        status: 403,
        statusText: "Forbidden",
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );

    await expect(responseErrorMessage(res)).resolves.toBe("403 Forbidden");
  });

  it("keeps concise API text errors", async () => {
    const res = new Response("permission denied", {
      status: 403,
      statusText: "Forbidden",
      headers: { "content-type": "text/plain; charset=utf-8" },
    });

    await expect(responseErrorMessage(res)).resolves.toBe("permission denied");
  });
});
