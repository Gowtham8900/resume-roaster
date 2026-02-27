import { z } from "zod";

export const analyzeInputSchema = z.object({
  text: z.string().min(1).max(20000).optional(),
  sourceType: z.enum(["paste", "pdf"]),
});

export const roastInputSchema = z.object({
  text: z.string().min(1).max(20000),
  roastLevel: z.enum(["light", "medium", "spicy"]),
});

export const improveInputSchema = z.object({
  text: z.string().min(1).max(20000),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;
export type RoastInput = z.infer<typeof roastInputSchema>;
export type ImproveInput = z.infer<typeof improveInputSchema>;

export interface BreakdownItem {
  name: string;
  score: number;
  note: string;
}

export interface DetectedInfo {
  wordCount: number;
  bulletCount: number;
  metricCount: number;
  linkCount: number;
  hasProjects: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
  hasEducation: boolean;
}

export interface AnalyzeResponse {
  score: number;
  label: string;
  summary: string;
  breakdown: BreakdownItem[];
  strengths: string[];
  redFlags: string[];
  detected: DetectedInfo;
  disclaimers: string[];
}

export interface RoastResponse {
  title: string;
  roastLines: string[];
  bestLine: string;
  redemption: string[];
  boundaries: string[];
}

export interface ImproveResponse {
  priorityFixes: string[];
  rewrittenBullets: Array<{ before: string; after: string }>;
  improvedSummary: string;
  atsTips: string[];
}
