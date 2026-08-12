import { describe, expect, test } from "bun:test";

import { matchOperation } from "./worker";

const operation = (operationId: string) => ({
  operationId,
  responses: {}
});

const documentWith = (paths: Record<string, unknown>) =>
  ({
    openapi: "3.1.0",
    info: { title: "Test API", version: "1.0.0" },
    paths
  }) as Parameters<typeof matchOperation>[0];

describe("matchOperation", () => {
  test("matches a standard method by route", () => {
    const matched = matchOperation(
      documentWith({ "/health": { head: operation("healthCheck") } }),
      "/health"
    );

    expect(matched).toEqual({
      operation: operation("healthCheck"),
      originalPath: "/health",
      method: "HEAD"
    });
  });

  test("matches a standard method by operation id", () => {
    const matched = matchOperation(
      documentWith({ "/jobs": { trace: operation("traceJobs") } }),
      "/traceJobs"
    );

    expect(matched).toEqual({
      operation: operation("traceJobs"),
      originalPath: "/jobs",
      method: "TRACE"
    });
  });
});
