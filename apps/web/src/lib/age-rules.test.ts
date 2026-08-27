import { describe, expect, it } from "vitest";

import { getMatchAgeBounds } from "./age-rules";

const birthdayForAge = (age: number) => {
  const today = new Date();
  return new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate() - 1
  )
    .toISOString()
    .slice(0, 10);
};

describe("match age rules", () => {
  it("starts adult matching at 23", () => {
    expect(getMatchAgeBounds(birthdayForAge(35))).toEqual({ max: 99, min: 23 });
  });

  it("keeps 18-20 year olds in the protected 18-22 range", () => {
    expect(getMatchAgeBounds(birthdayForAge(20))).toEqual({ max: 22, min: 18 });
  });
});
