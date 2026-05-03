import { describe, expect, it } from "vitest";

import { signupSchema } from "../auth/auth.validation";
import { securityService } from "../security-system/security.service";
import { xpService } from "./xp.service";

describe("production policy guards", () => {
  it("awards exactly 1 XP per completed minute for every timer mode", () => {
    expect(xpService.sessionXp("POMODORO", 25 * 60)).toBe(25);
    expect(xpService.sessionXp("SHORT_BREAK", 5 * 60)).toBe(5);
    expect(xpService.sessionXp("LONG_BREAK", 15 * 60)).toBe(15);
    expect(xpService.sessionXp("CUSTOM", 73 * 60 + 59)).toBe(73);
  });

  it("keeps signup validation and service password policy aligned at 9 characters", () => {
    const password = "Password1";
    expect(signupSchema.safeParse({
      fullName: "Launch User",
      username: "launch_user",
      email: "launch@example.com",
      password,
      timezone: "UTC"
    }).success).toBe(true);
    expect(securityService.isPasswordStrong(password)).toBe(true);
  });
});
