import type { AnalyzeResponse, BreakdownItem, DetectedInfo } from "../../shared/schema";

const BUZZWORDS = [
  "synergy", "passionate", "dynamic", "self-starter", "hardworking", "team player",
  "results-driven", "go-getter", "proactive", "detail-oriented", "innovative",
  "guru", "ninja", "rockstar", "visionary", "thought leader", "motivated",
  "dedicated", "enthusiastic", "strategic thinker", "fast learner", "people person",
  "outside the box", "value-added", "best of breed", "paradigm", "leverage",
  "synergize", "holistic", "bandwidth", "deep dive", "circle back", "low-hanging fruit",
  "move the needle", "game-changer", "disruptive", "bleeding edge", "mission-critical",
  "action-oriented", "bottom line", "core competency", "empower", "stakeholder",
  "scalable", "ecosystem", "pivot", "agile mindset", "wear many hats",
];

const TECH_DICTIONARY = [
  "react", "angular", "vue", "svelte", "next.js", "nuxt", "gatsby",
  "node.js", "express", "fastify", "django", "flask", "rails", "spring",
  "typescript", "javascript", "python", "java", "c#", "c++", "go", "rust", "kotlin", "swift",
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
  "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "cassandra",
  "kafka", "rabbitmq", "graphql", "rest", "grpc", "websocket",
  "ci/cd", "jenkins", "github actions", "gitlab ci", "circleci",
  "react native", "flutter", "ionic", ".net", "laravel", "symfony",
  "tailwind", "sass", "less", "webpack", "vite", "rollup",
  "figma", "sketch", "photoshop", "illustrator",
  "sql", "nosql", "linux", "nginx", "apache",
  "git", "jira", "confluence", "slack",
  "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
  "pandas", "numpy", "spark", "hadoop", "airflow", "dbt",
  "tableau", "power bi", "looker", "snowflake", "bigquery", "redshift",
  "oauth", "jwt", "saml", "ldap", "openid",
  "microservices", "serverless", "lambda", "s3", "ec2", "cloudfront",
];

const SCALE_WORDS = [
  "million", "billion", "high-traffic", "distributed", "microservices",
  "latency", "throughput", "scalability", "concurrent", "petabyte",
  "terabyte", "real-time", "low-latency", "fault-tolerant", "load balancing",
  "horizontal scaling", "vertical scaling", "sharding", "replication",
];

const IMPACT_VERBS = [
  "reduced", "increased", "improved", "boosted", "grew", "saved",
  "generated", "delivered", "achieved", "optimized", "accelerated",
  "streamlined", "automated", "eliminated", "decreased", "doubled",
  "tripled", "launched", "shipped", "deployed", "migrated", "designed",
  "architected", "built", "developed", "implemented", "created",
  "established", "led", "managed", "mentored", "coached", "trained",
];

const SHIPPING_VERBS = ["built", "shipped", "launched", "deployed", "released", "published", "created", "developed"];

const VAGUE_PHRASES = [
  "responsible for", "duties included", "helped with", "assisted in",
  "worked on", "involved in", "participated in", "tasked with",
  "in charge of", "various tasks", "day-to-day", "miscellaneous",
];

const ROUTINE_ROLE_KEYWORDS = [
  "data entry", "receptionist", "filing", "administrative assistant",
  "cashier", "clerk", "customer service representative", "operator",
];

const OWNERSHIP_KEYWORDS = [
  "led", "owned", "architected", "designed", "founded", "co-founded",
  "principal", "staff", "senior", "director", "vp", "head of",
  "chief", "manager", "tech lead", "team lead",
];

const ADAPTABILITY_KEYWORDS = [
  "learned", "migrated", "adopted", "transitioned", "pivoted",
  "cross-functional", "full-stack", "multi-stack", "polyglot",
  "led adoption", "introduced", "pioneered",
];

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionHeaders: Record<string, RegExp> = {
    experience: /\b(experience|employment|work history|professional experience|career)\b/i,
    projects: /\b(projects|personal projects|side projects|portfolio)\b/i,
    skills: /\b(skills|technical skills|technologies|competencies|proficiencies|tech stack)\b/i,
    education: /\b(education|academic|degree|university|college|school)\b/i,
    summary: /\b(summary|objective|profile|about|about me|professional summary|career objective)\b/i,
    certifications: /\b(certifications?|licenses?|credentials|accreditations?)\b/i,
  };

  const lines = text.split("\n");
  let currentSection = "preamble";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    let matched = false;

    for (const [name, regex] of Object.entries(sectionHeaders)) {
      if (regex.test(trimmed) && trimmed.length < 60) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = name;
        currentContent = [];
        matched = true;
        break;
      }
    }

    if (!matched) {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join("\n").trim();
  }

  return sections;
}

function extractBullets(text: string): string[] {
  const lines = text.split("\n");
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*►▪▸◦‣]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const cleaned = trimmed.replace(/^[-•*►▪▸◦‣\d.)\s]+/, "").trim();
      if (cleaned.length > 5) {
        bullets.push(cleaned);
      }
    }
  }

  return bullets;
}

function countMetrics(text: string): number {
  const patterns = [
    /\d+%/g,
    /\$[\d,]+/g,
    /\d+(?:ms|s|sec|mins?|hours?|days?)\b/g,
    /\d+(?:k|m|b)\b/gi,
    /\d+x\b/gi,
    /\d[\d,]*\+?\s*(?:users?|customers?|clients?|transactions?|requests?|downloads?)/gi,
  ];

  let count = 0;
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) count += matches.length;
  }

  const impactPattern = /(?:reduced|increased|improved|boosted|grew|saved|generated|optimized)\s+\w+\s+(?:by\s+)?\d/gi;
  const impactMatches = text.match(impactPattern);
  if (impactMatches) count += impactMatches.length;

  return count;
}

function countLinks(text: string): number {
  const urlPattern = /https?:\/\/[^\s)]+/gi;
  const matches = text.match(urlPattern);
  return matches ? matches.length : 0;
}

function detectBuzzwords(text: string): { hits: number; found: string[] } {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const bw of BUZZWORDS) {
    if (lower.includes(bw)) {
      found.push(bw);
    }
  }

  return { hits: found.length, found };
}

function detectTechStack(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const tech of TECH_DICTIONARY) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lower)) {
      found.push(tech);
    }
  }

  return [...new Set(found)];
}

function detectScaleWords(text: string): string[] {
  const lower = text.toLowerCase();
  return SCALE_WORDS.filter((w) => lower.includes(w));
}

function detectVaguePhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return VAGUE_PHRASES.filter((p) => lower.includes(p));
}

function detectImpactVerbs(text: string): string[] {
  const lower = text.toLowerCase();
  return IMPACT_VERBS.filter((v) => {
    const regex = new RegExp(`\\b${v}\\b`, "i");
    return regex.test(lower);
  });
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function analyzeResume(text: string): AnalyzeResponse {
  const cleaned = cleanText(text);
  const sections = extractSections(cleaned);
  const bullets = extractBullets(cleaned);
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const metricCount = countMetrics(cleaned);
  const linkCount = countLinks(cleaned);
  const buzzwordResult = detectBuzzwords(cleaned);
  const techStack = detectTechStack(cleaned);
  const scaleWords = detectScaleWords(cleaned);
  const vaguePhrases = detectVaguePhrases(cleaned);
  const impactVerbs = detectImpactVerbs(cleaned);

  const hasExperience = !!sections.experience;
  const hasProjects = !!sections.projects;
  const hasSkills = !!sections.skills;
  const hasEducation = !!sections.education;
  const hasSummary = !!sections.summary;
  const hasCertifications = !!sections.certifications;

  const hasShippingVerbs = SHIPPING_VERBS.some((v) =>
    new RegExp(`\\b${v}\\b`, "i").test(cleaned)
  );
  const hasGitHubLink = /github\.com/i.test(cleaned);
  const hasWebsiteLink = /(?:portfolio|\.dev|\.io|\.com\/~|personal\s*website)/i.test(cleaned);

  const buzzwordDensity = wordCount > 0 ? buzzwordResult.hits / wordCount : 0;

  const longBullets = bullets.filter((b) => b.split(/\s+/).length > 35);
  const shortBullets = bullets.filter((b) => b.split(/\s+/).length < 6);

  const lower = cleaned.toLowerCase();
  const hasRoutineRoleSignals = ROUTINE_ROLE_KEYWORDS.some((k) => lower.includes(k));
  const hasOwnershipSignals = OWNERSHIP_KEYWORDS.some((k) => {
    const regex = new RegExp(`\\b${k}\\b`, "i");
    return regex.test(lower);
  });
  const hasAdaptabilitySignals = ADAPTABILITY_KEYWORDS.some((k) => {
    const regex = new RegExp(`\\b${k}\\b`, "i");
    return regex.test(lower);
  });

  let roleSusceptibility = 50;
  if (hasRoutineRoleSignals) roleSusceptibility += 20;
  if (hasOwnershipSignals) roleSusceptibility -= 15;
  if (vaguePhrases.length > 3) roleSusceptibility += 10;
  if (impactVerbs.length > 5) roleSusceptibility -= 10;
  roleSusceptibility = Math.max(0, Math.min(100, roleSusceptibility));

  let proofOfImpact = 20;
  if (bullets.length > 0) {
    const metricRatio = metricCount / bullets.length;
    proofOfImpact += Math.min(40, metricRatio * 50);
  }
  if (impactVerbs.length > 3) proofOfImpact += 15;
  if (impactVerbs.length > 7) proofOfImpact += 10;
  if (metricCount > 5) proofOfImpact += 10;
  proofOfImpact = Math.max(0, Math.min(100, proofOfImpact));

  let differentiation = 15;
  differentiation += Math.min(35, techStack.length * 3);
  if (scaleWords.length > 0) differentiation += 15;
  if (scaleWords.length > 3) differentiation += 10;
  if (techStack.length > 10) differentiation += 10;
  if (hasCertifications) differentiation += 5;
  differentiation = Math.max(0, Math.min(100, differentiation));

  let portfolioSignals = 10;
  if (hasGitHubLink) portfolioSignals += 20;
  if (hasWebsiteLink) portfolioSignals += 15;
  if (hasProjects) portfolioSignals += 20;
  if (hasShippingVerbs) portfolioSignals += 15;
  if (linkCount > 2) portfolioSignals += 10;
  portfolioSignals = Math.max(0, Math.min(100, portfolioSignals));

  let clarity = 40;
  const presentSections = [hasExperience, hasSkills, hasEducation, hasSummary].filter(Boolean).length;
  clarity += presentSections * 8;
  if (buzzwordDensity > 0.02) clarity -= 15;
  if (buzzwordDensity > 0.04) clarity -= 10;
  if (longBullets.length > 3) clarity -= 10;
  if (shortBullets.length > bullets.length * 0.5 && bullets.length > 3) clarity -= 10;
  if (vaguePhrases.length > 2) clarity -= 10;
  if (vaguePhrases.length === 0 && bullets.length > 3) clarity += 10;
  clarity = Math.max(0, Math.min(100, clarity));

  let adaptability = 20;
  if (hasAdaptabilitySignals) adaptability += 25;
  const multiStack = techStack.length > 5;
  if (multiStack) adaptability += 20;
  if (techStack.length > 10) adaptability += 10;
  if (scaleWords.length > 0) adaptability += 10;
  adaptability = Math.max(0, Math.min(100, adaptability));

  const breakdown: BreakdownItem[] = [
    {
      name: "Role Susceptibility",
      score: roleSusceptibility,
      note: roleSusceptibility > 60
        ? "Your role description suggests tasks that could be automated"
        : roleSusceptibility > 40
        ? "Mixed signals - some unique ownership, some routine tasks"
        : "Strong ownership and leadership signals detected",
    },
    {
      name: "Proof of Impact",
      score: proofOfImpact,
      note: proofOfImpact < 30
        ? "Very few quantified achievements - add numbers!"
        : proofOfImpact < 60
        ? "Some metrics found, but more data-backed results would help"
        : "Good use of quantified impact and action verbs",
    },
    {
      name: "Differentiation",
      score: differentiation,
      note: differentiation < 30
        ? "Generic skill set - needs more specialized or advanced tech"
        : differentiation < 60
        ? `${techStack.length} technologies detected - consider highlighting advanced skills`
        : `Strong tech depth with ${techStack.length} technologies and scale indicators`,
    },
    {
      name: "Portfolio & Shipping Signals",
      score: portfolioSignals,
      note: portfolioSignals < 30
        ? "No links, projects, or evidence of shipping found"
        : portfolioSignals < 60
        ? "Some signals but missing GitHub/portfolio links or projects section"
        : "Good evidence of building and shipping real work",
    },
    {
      name: "Clarity & Structure",
      score: clarity,
      note: clarity < 40
        ? "Missing key sections, high buzzword density, or unclear formatting"
        : clarity < 70
        ? "Decent structure with room for improvement in conciseness"
        : "Well-organized with clear, readable sections",
    },
    {
      name: "Adaptability Signals",
      score: adaptability,
      note: adaptability < 30
        ? "No signals of learning new tech or cross-functional work"
        : adaptability < 60
        ? "Some adaptability signals detected"
        : "Strong signals of continuous learning and adaptation",
    },
  ];

  const weights = [0.2, 0.25, 0.15, 0.15, 0.15, 0.1];
  const scores = breakdown.map((b) => b.score);
  const weightedAvg = scores.reduce((sum, s, i) => sum + s * weights[i], 0);
  const riskScore = Math.max(1, Math.min(10, Math.ceil(weightedAvg / 10)));

  const invertedRisk = 11 - riskScore;
  const label = invertedRisk <= 3 ? "High Risk" : invertedRisk <= 6 ? "Medium Risk" : "Low Risk";
  const finalScore = invertedRisk;

  const strengths: string[] = [];
  const redFlags: string[] = [];

  if (metricCount > 3) strengths.push("Quantified achievements with specific metrics");
  if (techStack.length > 8) strengths.push(`Diverse tech stack (${techStack.length} technologies)`);
  if (hasProjects) strengths.push("Dedicated projects section showing initiative");
  if (hasGitHubLink || hasWebsiteLink) strengths.push("Links to portfolio or code samples");
  if (impactVerbs.length > 5) strengths.push("Strong action verbs throughout");
  if (hasOwnershipSignals) strengths.push("Evidence of leadership and ownership");
  if (hasAdaptabilitySignals) strengths.push("Signals of adaptability and growth");
  if (presentSections >= 4) strengths.push("Complete resume structure with all key sections");
  if (hasCertifications) strengths.push("Professional certifications listed");
  if (scaleWords.length > 0) strengths.push("Experience at scale mentioned");
  if (strengths.length === 0) strengths.push("Resume text was provided for analysis");

  if (metricCount === 0) redFlags.push("Zero quantified metrics - every bullet should have numbers");
  if (!hasProjects && !hasGitHubLink) redFlags.push("No projects or code portfolio visible");
  if (buzzwordResult.hits > 3) redFlags.push(`High buzzword density (${buzzwordResult.found.slice(0, 3).join(", ")}...)`);
  if (vaguePhrases.length > 0) redFlags.push(`Vague phrases detected: "${vaguePhrases[0]}"`);
  if (!hasExperience) redFlags.push("No experience section found");
  if (!hasSkills) redFlags.push("No dedicated skills section");
  if (!hasSummary) redFlags.push("Missing summary/profile section");
  if (longBullets.length > 2) redFlags.push("Several overly long bullet points");
  if (shortBullets.length > 3) redFlags.push("Too many short, unsubstantial bullet points");
  if (linkCount === 0) redFlags.push("No URLs or links found anywhere");
  if (wordCount < 150) redFlags.push("Resume seems very short - too few details");
  if (wordCount > 1200) redFlags.push("Resume may be too long - consider trimming");

  const strengthA = strengths[0] || "some content";
  const weakness = redFlags[0] || "minor formatting issues";
  const topFix = redFlags.length > 0
    ? redFlags[0].toLowerCase().replace(/^no\s+/, "adding ").replace(/^zero\s+/, "adding ").replace(/^missing\s+/, "adding a ")
    : "minor polishing";

  const summary = `Your resume shows ${strengthA.toLowerCase()}${strengths.length > 1 ? ` and ${strengths[1].toLowerCase()}` : ""}, but it's held back by ${weakness.toLowerCase()}. Fixing ${topFix} will immediately improve your score.`;

  const detected: DetectedInfo = {
    wordCount,
    bulletCount: bullets.length,
    metricCount,
    linkCount,
    hasProjects,
    hasExperience,
    hasSkills,
    hasEducation,
  };

  const disclaimers = [
    "This analysis is rule-based and does not use any AI/LLM.",
    "Scores are computed from heuristic pattern matching and may not capture all nuances.",
    "A high risk score does not mean you'll be replaced - it highlights areas to strengthen.",
  ];

  return {
    score: finalScore,
    label,
    summary,
    breakdown: breakdown.map((b) => ({
      ...b,
      score: Math.round(100 - b.score),
    })),
    strengths,
    redFlags,
    detected,
    disclaimers,
  };
}

export { simpleHash, extractBullets, detectBuzzwords, detectVaguePhrases, detectTechStack };
