import type { ImproveResponse } from "../../shared/schema";
import { extractBullets, detectBuzzwords, detectVaguePhrases, detectTechStack } from "./analyzer";

const ACTION_VERBS = [
  "Spearheaded", "Engineered", "Orchestrated", "Delivered", "Optimized",
  "Streamlined", "Architected", "Accelerated", "Implemented", "Transformed",
  "Automated", "Launched", "Revamped", "Pioneered", "Consolidated",
];

export function generateImprovements(text: string): ImproveResponse {
  const bullets = extractBullets(text);
  const buzzResult = detectBuzzwords(text);
  const vague = detectVaguePhrases(text);
  const tech = detectTechStack(text);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  const metricPatterns = [/\d+%/g, /\$[\d,]+/g, /\d+x\b/gi];
  let metricCount = 0;
  for (const p of metricPatterns) {
    const m = text.match(p);
    if (m) metricCount += m.length;
  }

  const linkCount = (text.match(/https?:\/\/[^\s)]+/gi) || []).length;
  const hasSummary = /\b(summary|objective|profile|about)\b/i.test(text);
  const hasProjects = /\b(projects|personal projects|side projects|portfolio)\b/i.test(text);
  const hasSkills = /\b(skills|technical skills|technologies)\b/i.test(text);

  const priorityFixes: string[] = [];

  if (metricCount === 0) {
    priorityFixes.push(
      "Add quantified metrics to every bullet point. Use numbers like percentages, dollar amounts, time saved, users impacted. Even estimates with (~X%) are better than nothing."
    );
  } else if (metricCount < 3) {
    priorityFixes.push(
      "You have a few metrics, but aim for at least one quantified result per role. Replace vague claims with specific numbers."
    );
  }

  if (vague.length > 0) {
    priorityFixes.push(
      `Replace vague phrases like "${vague[0]}" with specific action verbs followed by measurable outcomes. Use verbs like "Engineered," "Delivered," or "Optimized."`
    );
  }

  if (!hasSummary) {
    priorityFixes.push(
      "Add a professional summary section (2-3 sentences) at the top that positions you for your target role and highlights your strongest differentiators."
    );
  }

  if (!hasProjects) {
    priorityFixes.push(
      "Add a Projects section showcasing 2-3 things you've built, with tech stack, what you did, and a link if possible. This proves you ship."
    );
  }

  if (linkCount === 0) {
    priorityFixes.push(
      "Add links to your GitHub, portfolio, or LinkedIn profile. Recruiters want to see evidence of your work online."
    );
  }

  if (buzzResult.hits > 3) {
    priorityFixes.push(
      `Cut the buzzwords (${buzzResult.found.slice(0, 3).join(", ")}). Replace each with a concrete example of what you actually did.`
    );
  }

  if (wordCount > 1000) {
    priorityFixes.push(
      "Your resume is too long. Cut it to one page by removing the weakest bullets and keeping only your top achievements per role."
    );
  }

  if (!hasSkills) {
    priorityFixes.push(
      "Add a dedicated Skills/Technologies section grouped by category (Languages, Frameworks, Tools, Cloud, etc.)."
    );
  }

  if (tech.length < 3) {
    priorityFixes.push(
      "Name specific technologies throughout your bullets instead of being vague. 'Built a REST API' becomes 'Built a REST API using Node.js, Express, and PostgreSQL.'"
    );
  }

  while (priorityFixes.length < 3) {
    priorityFixes.push(
      "Review each bullet for the pattern: [Action Verb] + [What You Did] + [Technology Used] + [Measurable Result]. Rewrite any that don't match."
    );
  }

  const rewrittenBullets = generateBulletRewrites(bullets, tech);
  const improvedSummary = generateSummary(text, tech);

  const atsTips: string[] = [
    "Use a single-column layout to ensure ATS can parse your resume correctly.",
    "Avoid tables, text boxes, headers/footers, and multi-column formats.",
    "Use standard section headings: Experience, Education, Skills, Projects.",
    "Save as PDF to preserve formatting across devices.",
  ];

  if (wordCount < 200) {
    atsTips.push("Your resume seems very sparse - expand with more detail and achievements.");
  }

  const datePatterns = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b\s*\d{4}/gi);
  const dashDates = text.match(/\d{4}\s*[-–]\s*(?:\d{4}|present|current)/gi);
  if (!datePatterns && !dashDates) {
    atsTips.push("Use consistent date formats throughout (e.g., 'Jan 2022 - Present' or '2022 - Present').");
  }

  return {
    priorityFixes: priorityFixes.slice(0, 7),
    rewrittenBullets,
    improvedSummary,
    atsTips,
  };
}

function generateBulletRewrites(bullets: string[], tech: string[]): Array<{ before: string; after: string }> {
  const rewrites: Array<{ before: string; after: string }> = [];

  const vaguePatterns = [
    /responsible for/i,
    /helped with/i,
    /assisted in/i,
    /worked on/i,
    /involved in/i,
    /participated in/i,
    /tasked with/i,
    /various/i,
    /miscellaneous/i,
  ];

  const candidates = bullets.filter((b) => {
    const isVague = vaguePatterns.some((p) => p.test(b));
    const hasNoMetric = !/\d+%|\$[\d,]+|\d+x\b/i.test(b);
    return isVague || hasNoMetric;
  });

  const toRewrite = candidates.slice(0, 3);
  if (toRewrite.length === 0 && bullets.length > 0) {
    toRewrite.push(...bullets.slice(0, Math.min(3, bullets.length)));
  }

  const verbs = ["Spearheaded", "Engineered", "Delivered", "Optimized", "Streamlined", "Architected"];

  for (let i = 0; i < toRewrite.length; i++) {
    const before = toRewrite[i];
    const verb = verbs[i % verbs.length];

    let core = before
      .replace(/^(responsible for|helped with|assisted in|worked on|involved in|participated in|tasked with)\s*/i, "")
      .replace(/^(built|created|developed|designed|implemented|managed|led|established|launched|deployed|maintained|wrote|authored|handled|conducted|performed|executed|coordinated|organized|facilitated|supported|contributed to)\s+/i, "")
      .replace(/\.$/, "")
      .trim();

    if (core.length > 100) {
      core = core.substring(0, 97) + "...";
    }

    const existingTech = tech.filter((t) => before.toLowerCase().includes(t.toLowerCase()));
    const newTech = tech.filter((t) => !before.toLowerCase().includes(t.toLowerCase()));
    const techMention = newTech.length > 0 ? ` leveraging ${newTech.slice(0, 2).join(" and ")}` : "";
    const after = `${verb} ${core.charAt(0).toLowerCase() + core.slice(1)}${techMention}, resulting in (~X%) improvement in [key metric]`;

    rewrites.push({ before, after });
  }

  return rewrites;
}

function generateSummary(text: string, tech: string[]): string {
  const lower = text.toLowerCase();

  let role = "software professional";
  const rolePatterns: [RegExp, string][] = [
    [/\b(senior|sr\.?)\s*(software|frontend|backend|full.?stack)\s*(engineer|developer)\b/i, "Senior Software Engineer"],
    [/\b(software|frontend|backend|full.?stack)\s*(engineer|developer)\b/i, "Software Engineer"],
    [/\bdata\s*(scientist|analyst|engineer)\b/i, "Data Professional"],
    [/\b(product|program|project)\s*manager\b/i, "Product/Program Manager"],
    [/\b(devops|sre|site reliability|platform)\s*(engineer)?\b/i, "DevOps/Platform Engineer"],
    [/\b(designer|ux|ui)\b/i, "Designer"],
    [/\b(marketing|growth|content)\s*(manager|specialist|lead)?\b/i, "Marketing Professional"],
  ];

  for (const [pattern, label] of rolePatterns) {
    if (pattern.test(lower)) {
      role = label;
      break;
    }
  }

  const topTech = tech.slice(0, 4).join(", ");
  const techPhrase = topTech ? ` specializing in ${topTech}` : "";

  const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i);
  const yearsPhrase = yearsMatch ? ` with ${yearsMatch[1]}+ years of experience` : "";

  return `Results-driven ${role}${yearsPhrase}${techPhrase}. Proven track record of delivering scalable solutions and driving measurable business impact. Seeking to leverage technical expertise and leadership skills to [target goal/company mission].`;
}
