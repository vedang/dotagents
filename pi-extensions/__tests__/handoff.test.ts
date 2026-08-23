import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";

vi.mock("@earendil-works/pi-coding-agent", () => ({
  BorderedLoader: class {
    readonly signal = new AbortController().signal;
    onAbort: (() => void) | undefined;
  },
  convertToLlm: () => [],
  serializeConversation: () => "selected conversation context",
}));

import handoff from "../handoff";

type CommandOptions = Parameters<ExtensionAPI["registerCommand"]>[1];
type CommandHandler = CommandOptions["handler"];

function assertDefined<T>(value: T | undefined, message: string): T {
  expect(value, message).toBeDefined();
  return value as T;
}

test("handoff delegates completion to the host model registry", async () => {
  let handler: CommandHandler | undefined;
  const pi = {
    registerCommand(name: string, options: CommandOptions) {
      if (name === "handoff") {
        handler = options.handler;
      }
    },
  };
  handoff(pi as unknown as ExtensionAPI);

  const model = { provider: "custom-provider", id: "custom-model" };
  const complete = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "generated handoff prompt" }],
    stopReason: "stop",
  });
  const editor = vi.fn().mockResolvedValue(undefined);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await assertDefined(handler, "handoff command should be registered")(
      "continue with focused task",
      {
        hasUI: true,
        model,
        modelRegistry: { complete },
        sessionManager: {
          getBranch: () => [
            {
              type: "message",
              message: {
                role: "user",
                content: [{ type: "text", text: "original request" }],
                timestamp: Date.now(),
              },
            },
          ],
          getSessionFile: () => "/tmp/session.jsonl",
        },
        ui: {
          custom: async (
            render: (
              tui: object,
              theme: object,
              keybindings: object,
              done: (value: string | null) => void,
            ) => unknown,
          ) =>
            new Promise<string | null>((resolve) => {
              render({}, {}, {}, resolve);
            }),
          editor,
          notify: vi.fn(),
        },
        newSession: vi.fn(),
      } as unknown as Parameters<CommandHandler>[1],
    );
  } finally {
    consoleError.mockRestore();
  }

  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledWith(
    model,
    {
      systemPrompt: expect.stringContaining("context transfer assistant"),
      messages: [
        expect.objectContaining({
          role: "user",
          content: [
            {
              type: "text",
              text: expect.stringMatching(
                /selected conversation context[\s\S]*continue with focused task/,
              ),
            },
          ],
        }),
      ],
    },
    {
      signal: expect.any(AbortSignal),
      cacheRetention: "none",
      sessionId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    },
  );
  expect(editor).toHaveBeenCalledWith(
    "Edit handoff prompt",
    "generated handoff prompt",
  );
});
