import type {
  ExtensionAPI,
  SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { expect, test, vi } from "vitest";

vi.mock("@earendil-works/pi-coding-agent", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@earendil-works/pi-coding-agent")>();
  return {
    ...actual,
    BorderedLoader: class {
      readonly signal = new AbortController().signal;
      onAbort: (() => void) | undefined;
    },
  };
});

import handoff from "../handoff";

type CommandOptions = Parameters<ExtensionAPI["registerCommand"]>[1];
type CommandHandler = CommandOptions["handler"];

function assertDefined<T>(value: T | undefined, message: string): T {
  expect(value, message).toBeDefined();
  return value as T;
}

function getHandoffHandler(): CommandHandler {
  let handler: CommandHandler | undefined;
  const pi = {
    registerCommand(name: string, options: CommandOptions) {
      if (name === "handoff") {
        handler = options.handler;
      }
    },
  };
  handoff(pi as unknown as ExtensionAPI);
  return assertDefined(handler, "handoff command should be registered");
}

test("handoff delegates completion to the host model registry", async () => {
  const handler = getHandoffHandler();

  const model = { provider: "custom-provider", id: "custom-model" };
  const complete = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "generated handoff prompt" }],
    stopReason: "stop",
  });
  const editor = vi.fn().mockResolvedValue(undefined);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await handler("continue with focused task", {
      hasUI: true,
      model,
      modelRegistry: { complete },
      sessionManager: {
        buildContextEntries: () => [
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
    } as unknown as Parameters<CommandHandler>[1]);
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
                /original request[\s\S]*continue with focused task/,
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

test.each<{
  contextEntries: SessionEntry[];
  expectedContext: string[];
  name: string;
}>([
  {
    name: "custom messages",
    contextEntries: [
      {
        type: "custom_message",
        id: "custom-entry",
        parentId: null,
        timestamp: "2026-08-22T18:00:00.000Z",
        customType: "test-context",
        content: "model-visible custom context",
        display: false,
      },
    ],
    expectedContext: ["model-visible custom context"],
  },
  {
    name: "branch summaries",
    contextEntries: [
      {
        type: "branch_summary",
        id: "branch-summary",
        parentId: null,
        timestamp: "2026-08-22T18:00:00.000Z",
        fromId: "prior-branch",
        summary: "model-visible branch summary",
      },
    ],
    expectedContext: ["model-visible branch summary"],
  },
  {
    name: "compacted branches",
    contextEntries: [
      {
        type: "compaction",
        id: "compaction",
        parentId: null,
        timestamp: "2026-08-22T18:00:00.000Z",
        summary: "latest compaction summary",
        firstKeptEntryId: "retained-context",
        tokensBefore: 1234,
      },
      {
        type: "custom_message",
        id: "retained-context",
        parentId: "compaction",
        timestamp: "2026-08-22T18:01:00.000Z",
        customType: "test-context",
        content: "retained context after compaction",
        display: false,
      },
    ],
    expectedContext: [
      "latest compaction summary",
      "retained context after compaction",
    ],
  },
])(
  "handoff preserves host-selected $name",
  async ({ contextEntries, expectedContext }) => {
    const handler = getHandoffHandler();
    const model = { provider: "custom-provider", id: "custom-model" };
    const complete = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "generated handoff prompt" }],
      stopReason: "stop",
    });

    await handler("continue with focused task", {
      hasUI: true,
      model,
      modelRegistry: { complete },
      sessionManager: {
        buildContextEntries: () => contextEntries,
        getBranch: () => {
          throw new Error("handoff should use host-selected context entries");
        },
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
        editor: vi.fn().mockResolvedValue(undefined),
        notify: vi.fn(),
      },
      newSession: vi.fn(),
    } as unknown as Parameters<CommandHandler>[1]);

    expect(complete).toHaveBeenCalledTimes(1);
    const completionRequest = complete.mock.calls[0]?.[1] as {
      messages: Array<{ content: Array<{ text: string }> }>;
    };
    const prompt = completionRequest.messages[0]?.content[0]?.text;
    for (const expected of expectedContext) {
      expect(prompt).toContain(expected);
    }
  },
);

test("handoff opens an unlinked replacement from an ephemeral session", async () => {
  const handler = getHandoffHandler();
  const model = { provider: "custom-provider", id: "custom-model" };
  const complete = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "generated handoff prompt" }],
    stopReason: "stop",
  });
  const newSession = vi.fn().mockResolvedValue({ cancelled: false });

  await handler("continue with focused task", {
    hasUI: true,
    model,
    modelRegistry: { complete },
    sessionManager: {
      buildContextEntries: () => [
        {
          type: "message",
          message: {
            role: "user",
            content: [{ type: "text", text: "original request" }],
            timestamp: Date.now(),
          },
        },
      ],
      getSessionFile: () => undefined,
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
      editor: vi.fn().mockResolvedValue("edited handoff prompt"),
      notify: vi.fn(),
    },
    newSession,
  } as unknown as Parameters<CommandHandler>[1]);

  expect(newSession).toHaveBeenCalledTimes(1);
  expect(newSession.mock.calls[0]?.[0]).toStrictEqual({
    parentSession: undefined,
    withSession: expect.any(Function),
  });
});
