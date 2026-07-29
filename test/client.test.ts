import { describe, expect, it } from "vitest";

import commonScript from "../public/common.js?raw";
import eventScript from "../public/event.js?raw";
import scheduleScript from "../public/schedule.js?raw";

describe("anonymous product telemetry", () => {
  it("covers discovery, value, completion, and return events without cookies", () => {
    expect(commonScript).toContain('"visited"');
    expect(commonScript).toContain('"returned"');
    expect(commonScript).toContain("localStorage");
    expect(commonScript).not.toContain("document.cookie");
    expect(scheduleScript).toContain('"filters_used"');
    expect(eventScript).toContain('"event_viewed"');
    expect(eventScript).toContain('"share_copied"');
  });
});
