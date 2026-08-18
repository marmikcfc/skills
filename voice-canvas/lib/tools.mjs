// Tools the canvas chat model can call.
//
// Dispatch is a *function*, not a button that happens to have a model next to
// it: the model decides when the framing is done and calls it, and the button
// in the UI calls the exact same code path. One implementation, two triggers —
// so they can never drift.

import { dispatch } from "./dispatch.mjs";

export const DISPATCH_TOOL = {
  name: "dispatch_to_agent",
  description:
    "Send a fully-formed brief to the coding agent in the live session this canvas is attached to. " +
    "Call this only once the problem is framed well enough that the agent could act without further " +
    "clarification — it interrupts the user's real session. The brief should stand alone: state the " +
    "goal, the relevant constraints, and what done looks like. Do not call this to ask a question.",
  parameters: {
    type: "object",
    properties: {
      brief: {
        type: "string",
        description:
          "The self-contained instruction for the coding agent. Written as if to a capable engineer " +
          "who has the codebase but not this conversation.",
      },
      rationale: {
        type: "string",
        description: "One sentence for the user on why this is ready to dispatch.",
      },
    },
    required: ["brief"],
    additionalProperties: false,
  },
};

export const TOOLS = [DISPATCH_TOOL];

/**
 * Execute a tool call. Returns a string result the model sees next turn.
 * Never throws — a failed dispatch is information for the model, not a crash.
 */
export async function runTool(canvasId, name, input) {
  if (name !== DISPATCH_TOOL.name) {
    return `Unknown tool "${name}".`;
  }
  const brief = typeof input?.brief === "string" ? input.brief.trim() : "";
  if (!brief) return "Dispatch failed: brief was empty.";

  try {
    const { fromOffset } = await dispatch(canvasId, brief);
    return (
      `Dispatched into the live session (transcript offset ${fromOffset}). ` +
      `The agent has the brief and is working. Tell the user it's been sent — briefly — and ` +
      `that you'll report back what it did.`
    );
  } catch (err) {
    return `Dispatch failed: ${err.message}`;
  }
}
