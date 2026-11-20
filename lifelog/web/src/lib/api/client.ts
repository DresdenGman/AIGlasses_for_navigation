import type { ZodType } from "zod";
import type {
  AskRequest,
  AskResponse,
  BackupConfig,
  BackupStatus,
  DaySummary,
  Device,
  FrameDetail,
  GeneralSettings,
  Health,
  LastSeen,
  Locale,
  Place,
  PrivacySettings,
  Segment,
  SpeakerDay,
  Timeline,
  Utterance,
  WatchItem,
  YearArchive,
} from "@/lib/api/schemas";
import {
  AskResponseSchema,
  BackupConfigSchema,
  BackupStatusSchema,
  DaySummarySchema,
  DevicesResponseSchema,
  FramesResponseSchema,
  GeneralSettingsSchema,
  HealthSchema,
  LastSeenResponseSchema,
  PlacesResponseSchema,
  PrivacySettingsSchema,
  SegmentsResponseSchema,
  SpeakersResponseSchema,
  TimelineSchema,
  UtterancesResponseSchema,
  WatchlistResponseSchema,
  YearArchiveSchema,
} from "@/lib/api/schemas";
import { ShowcaseNotFound } from "@/lib/api/load";
import { showcase } from "@/lib/api/showcase";
import { DayInfoSchema } from "@/lib/api/schemas";
import type { DayInfo } from "@/lib/api/schemas";
import { z } from "zod";

export interface LifelogClient {
  getHealth(): Promise<Health>;
  getYear(): Promise<YearArchive>;
  listDays(): Promise<{ days: DayInfo[] }>;
  hasDay(day: string): Promise<boolean>;
  getTimeline(day: string, locale: Locale): Promise<Timeline>;
  listFrames(day: string, locale: Locale): Promise<{ frames: FrameDetail[]; next_page_token: string | null }>;
  listUtterances(day: string, locale: Locale): Promise<{ utterances: Utterance[] }>;
  listSegments(day: string, locale: Locale): Promise<{ segments: Segment[] }>;
  listSpeakers(day: string, locale: Locale): Promise<{ speakers: SpeakerDay[] }>;
  getSummary(day: string, locale: Locale): Promise<DaySummary | null>;
  getPlaces(locale: Locale): Promise<{ places: Place[] }>;
  getWatchlist(locale: Locale): Promise<{ items: WatchItem[] }>;
  getLastSeen(locale: Locale): Promise<{ items: LastSeen[]; searched_days: number }>;
  getPrivacy(): Promise<PrivacySettings>;
  getSettings(): Promise<GeneralSettings>;
  listDevices(): Promise<{ devices: Device[] }>;
  getBackupConfig(): Promise<BackupConfig>;
  getBackupStatus(): Promise<BackupStatus>;
  preparedAsks(locale: Locale): Promise<AskResponse[]>;
  ask(request: AskRequest): Promise<AskResponse>;
}

const showcaseClient: LifelogClient = {
  async getHealth() {
    return showcase.health();
  },
  async getYear() {
    return showcase.year();
  },
  async listDays() {
    return showcase.listDays();
  },
  async hasDay(day) {
    return showcase.hasDay(day);
  },
  async getTimeline(day, locale) {
    return showcase.getTimeline(day, locale);
  },
  async listFrames(day, locale) {
    return showcase.listFrames(day, locale);
  },
  async listUtterances(day, locale) {
    return showcase.listUtterances(day, locale);
  },
  async listSegments(day, locale) {
    return showcase.listSegments(day, locale);
  },
  async listSpeakers(day, locale) {
    return showcase.listSpeakers(day, locale);
  },
  async getSummary(day, locale) {
    return showcase.getSummary(day, locale);
  },
  async getPlaces(locale) {
    return showcase.getPlaces(locale);
  },
  async getWatchlist() {
    return showcase.getWatchlist();
  },
  async getLastSeen(locale) {
    return showcase.getLastSeen(locale);
  },
  async getPrivacy() {
    return showcase.getPrivacy();
  },
  async getSettings() {
    return showcase.getSettings();
  },
  async listDevices() {
    return showcase.listDevices();
  },
  async getBackupConfig() {
    return showcase.getBackupConfig();
  },
  async getBackupStatus() {
    return showcase.getBackupStatus();
  },
  async preparedAsks(locale) {
    return showcase.preparedAsks(locale);
  },
  async ask(request) {
    return showcase.ask(request);
  },
};

function liveClient(origin: string): LifelogClient {
  async function read<T>(pathname: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(pathname, origin), {
      ...init,
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json", "x-requested-with": "lifelog" } : {}),
        ...init?.headers,
      },
    });
    if (response.status === 404) throw new ShowcaseNotFound(pathname);
    if (!response.ok) throw new Error(`${response.status} ${pathname}`);
    return schema.parse(await response.json());
  }

  return {
    getHealth: () => read("/api/lifelog/health", HealthSchema),
    async getYear() {
      const listed = await read("/api/lifelog/days", z.object({ days: z.array(DayInfoSchema) }));
      const parsed = YearArchiveSchema.safeParse({
        schema: "aiglasses.lifelog.showcase.year",
        version: 1,
        synthetic: true,
        timezone: "America/Los_Angeles",
        from: listed.days.at(-1)?.day ?? "",
        to: listed.days[0]?.day ?? "",
        featured_day: listed.days[0]?.day ?? "",
        retention_days: 14,
        stats: {
          hours_captured: 0,
          questions_asked: 0,
          objects_found: 0,
          days_recorded: listed.days.length,
        },
        days: listed.days,
        questions_by_day: {},
        recurring: { people: [], places: [], objects: [] },
        testimonials: [],
      });
      if (!parsed.success) {
        throw new Error("Live /days did not fill a year archive. The showcase year file is the editorial source.");
      }
      return parsed.data;
    },
    listDays: () => read("/api/lifelog/days", z.object({ days: z.array(DayInfoSchema) })),
    async hasDay(day) {
      const listed = await this.listDays();
      return listed.days.some((item) => item.day === day);
    },
    getTimeline: (day) => read(`/api/lifelog/timeline/${day}`, TimelineSchema),
    listFrames: (day) => read(`/api/lifelog/frames?day=${day}&limit=500`, FramesResponseSchema),
    listUtterances: (day) => read(`/api/lifelog/utterances?day=${day}`, UtterancesResponseSchema),
    listSegments: (day) => read(`/api/lifelog/segments?day=${day}`, SegmentsResponseSchema),
    listSpeakers: (day) => read(`/api/lifelog/speakers?day=${day}`, SpeakersResponseSchema),
    async getSummary(day) {
      try {
        return await read(`/api/lifelog/summary/${day}`, DaySummarySchema);
      } catch (error) {
        if (error instanceof ShowcaseNotFound) return null;
        throw error;
      }
    },
    getPlaces: () => read("/api/lifelog/places", PlacesResponseSchema),
    getWatchlist: () => read("/api/lifelog/objects/watchlist", WatchlistResponseSchema),
    getLastSeen: () => read("/api/lifelog/objects/last-seen", LastSeenResponseSchema),
    getPrivacy: () => read("/api/lifelog/privacy", PrivacySettingsSchema),
    getSettings: () => read("/api/lifelog/settings", GeneralSettingsSchema),
    listDevices: () => read("/api/lifelog/devices", DevicesResponseSchema),
    getBackupConfig: () => read("/api/lifelog/backup/config", BackupConfigSchema),
    getBackupStatus: () => read("/api/lifelog/backup/status", BackupStatusSchema),
    async preparedAsks() {
      return [];
    },
    ask: (request) =>
      read("/api/lifelog/ask", AskResponseSchema, { method: "POST", body: JSON.stringify(request) }),
  };
}

export function getClient(): LifelogClient {
  if (process.env.LIFELOG_MODE === "live") {
    return liveClient(process.env.LIFELOG_API_ORIGIN ?? "http://127.0.0.1:8090");
  }
  return showcaseClient;
}
