import { describe, expect, it } from "vitest";

import app from "./app";

describe("server app", () => {
  it("responds to the health check", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("serves the OpenAPI document", async () => {
    const response = await app.request("/openapi.json");

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      info: {
        title: "Chewbuu API",
      },
      paths: {
        "/": {},
        "/ai": {},
      },
    });
  });

  it("serves the API reference page", async () => {
    const response = await app.request("/docs");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("Chewbuu API Reference");
  });
});
