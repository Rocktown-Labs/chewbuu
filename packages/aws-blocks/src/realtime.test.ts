import { Realtime, Scope } from "@aws-blocks/blocks";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("AWS Blocks realtime", () => {
  it("creates a typed channel descriptor for an authorized room", async () => {
    const scope = new Scope("test");
    const realtime = new Realtime(scope, "chat", {
      namespaces: {
        messages: Realtime.namespace(z.object({ text: z.string() })),
      },
    });

    const channel = await realtime.getChannel("messages", "room-1");
    const descriptor = channel.toJSON() as {
      __blocks: string;
      channel: string;
      token: string;
    };

    expect(descriptor).toMatchObject({
      __blocks: "realtime/channel",
      channel: "test-chat/messages/room-1",
    });
    expect(descriptor.token).toEqual(expect.any(String));
  });

  it("validates and publishes a chat payload locally", async () => {
    const scope = new Scope("test");
    const realtime = new Realtime(scope, "chat", {
      namespaces: {
        messages: Realtime.namespace(z.object({ text: z.string() })),
      },
    });

    await expect(
      realtime.publish("messages", "room-1", { text: "hello" })
    ).resolves.toBeUndefined();
  });
});
