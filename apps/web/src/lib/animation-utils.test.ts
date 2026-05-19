import { describe, expect, it } from "vitest";

import type { AnimationConfig, Point } from "@projection-mapping/shared";

import { applyAnimationToQuad, computeAnimatedOpacity } from "./animation-utils";

const baseAnimation: AnimationConfig = {
  type: "pulse",
  durationMs: 2000,
  loop: true,
  intensity: 0.2,
  delayMs: 0
};

describe("animation utils", () => {
  it("keeps the quad unchanged when animation is none", () => {
    const quad: [Point, Point, Point, Point] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];

    expect(applyAnimationToQuad(quad, { ...baseAnimation, type: "none" }, 500)).toEqual(quad);
  });

  it("modulates opacity for strobe animation", () => {
    expect(
      computeAnimatedOpacity(0.8, { ...baseAnimation, type: "strobe", intensity: 0.6 }, 300)
    ).toBeGreaterThan(0.12);
  });
});
