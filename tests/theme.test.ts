import test from "node:test";
import assert from "node:assert/strict";
import { getSemanticTokens } from "../src/frontend/theme/tokens/semantics/index.ts";

test("Design Tokens - getSemanticTokens light mode returns core palette", () => {
  const tokens = getSemanticTokens("light", false, "#10B981");
  assert.ok(tokens.colors, "Colors must be defined");
  assert.ok(tokens.colors.surface, "Surface colors must be defined");
  assert.ok(tokens.colors.text, "Text colors must be defined");
  assert.ok(tokens.spacing, "Spacing scale must be defined");
  assert.equal(typeof tokens.spacing.screenPaddingHorizontal, "number", "screenPaddingHorizontal should be a number");
  assert.equal(typeof tokens.spacing.cardPadding, "number", "cardPadding should be a number");
});

test("Design Tokens - getSemanticTokens amoled mode sets pure black background", () => {
  const tokens = getSemanticTokens("dark", true, "#10B981");
  assert.equal(tokens.colors.surface.background, "#000000", "AMOLED mode background must be #000000");
});
