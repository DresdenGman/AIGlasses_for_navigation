import { showcase } from "../src/lib/api/showcase";
import { FEATURED_DAY } from "../src/lib/time";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const year = showcase.year();
assert(year.days.length === 365, "365 days");
assert(year.days.filter((day) => day.cell_state === "recorded").length === 312, "captured");
assert(year.days.filter((day) => day.cell_state === "paused").length === 41, "paused");
assert(year.days.filter((day) => day.cell_state === "deleted").length === 12, "deleted");
const summary = showcase.getSummary(FEATURED_DAY, "en");
assert(summary?.coverage.frames === 162, "162 frames");
assert(showcase.listFrames(FEATURED_DAY, "en").frames.length === 162, "frame list");
assert(showcase.listUtterances(FEATURED_DAY, "en").utterances.length === 214, "utterances");
assert(showcase.getSettings().default_frame_interval_s === 300, "5 minute capture");
const asks = showcase.preparedAsks("en");
assert(asks.length === 24, "golden questions");
assert(asks.some((item) => item.status === "not_found" && item.citations.length === 0), "not found abstains");
assert(asks.find((item) => item.question.includes("screws"))?.citations.length, "screws cites");
assert(showcase.backupRuns().some((run) => run.state === "failed"), "failed backup kept");
assert(showcase.testimonials("en").some((item) => item.rating <= 2), "critical testimonial kept");
assert(showcase.getPrivacy().retention_days === 365, "retention 365");
console.log("showcase data ok");
