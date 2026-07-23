#!/usr/bin/env node
/**
 * SessionStart hook for the openfec plugin.
 *
 * The OpenFEC API requires an api.data.gov key. Without one the bundled MCP
 * server falls back to the shared DEMO_KEY, which is limited to a handful of
 * requests per hour and will make research fail partway through. This hook
 * surfaces a one-line reminder at session start ONLY when the key is missing,
 * so it stays quiet once configured.
 *
 * SessionStart hooks add their stdout to the session context, so the note is
 * visible to the agent (and therefore actionable) rather than buried in logs.
 */

const key = process.env.OPENFEC_API_KEY;

if (!key || key.trim() === "") {
  process.stdout.write(
    "[openfec plugin] OPENFEC_API_KEY is not set in this environment, so the " +
      "OpenFEC MCP server will use the rate-limited DEMO_KEY. For reliable " +
      "campaign-finance research, set OPENFEC_API_KEY (a free key from " +
      "https://api.open.fec.gov/developers/) in your shell environment before " +
      "starting Claude Code. If you configured the key only in the MCP server " +
      "env, the server still receives it and you can ignore this note.\n"
  );
}

process.exit(0);
