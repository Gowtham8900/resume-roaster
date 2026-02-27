import type { RoastResponse } from "../../shared/schema";
import { simpleHash, extractBullets, detectBuzzwords, detectVaguePhrases, detectTechStack } from "./analyzer";

type RoastLevel = "light" | "medium" | "spicy";
type TriggerFn = (ctx: RoastContext) => boolean;

interface RoastContext {
  text: string;
  wordCount: number;
  bulletCount: number;
  metricCount: number;
  linkCount: number;
  buzzwordCount: number;
  buzzwords: string[];
  vaguePhrases: string[];
  techStack: string[];
  hasProjects: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
  hasSummary: boolean;
  hasEducation: boolean;
}

interface RoastTemplate {
  minLevel: RoastLevel;
  trigger: TriggerFn;
  category: string;
  lines: string[];
}

const LEVEL_ORDER: Record<RoastLevel, number> = { light: 0, medium: 1, spicy: 2 };

function buildContext(text: string): RoastContext {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const bullets = extractBullets(text);
  const buzzResult = detectBuzzwords(text);
  const vague = detectVaguePhrases(text);
  const tech = detectTechStack(text);
  const lower = text.toLowerCase();

  const metricPatterns = [/\d+%/g, /\$[\d,]+/g, /\d+x\b/gi];
  let metricCount = 0;
  for (const p of metricPatterns) {
    const m = text.match(p);
    if (m) metricCount += m.length;
  }

  const linkCount = (text.match(/https?:\/\/[^\s)]+/gi) || []).length;

  return {
    text,
    wordCount: words.length,
    bulletCount: bullets.length,
    metricCount,
    linkCount,
    buzzwordCount: buzzResult.hits,
    buzzwords: buzzResult.found,
    vaguePhrases: vague,
    techStack: tech,
    hasProjects: /\b(projects|personal projects|side projects|portfolio)\b/i.test(text),
    hasExperience: /\b(experience|employment|work history)\b/i.test(text),
    hasSkills: /\b(skills|technical skills|technologies)\b/i.test(text),
    hasSummary: /\b(summary|objective|profile|about)\b/i.test(text),
    hasEducation: /\b(education|academic|degree|university)\b/i.test(text),
  };
}

const TEMPLATES: RoastTemplate[] = [
  {
    minLevel: "light",
    trigger: () => true,
    category: "overall",
    lines: [
      "I've seen better resumes on the back of napkins at a Denny's.",
      "Your resume walked into the room and the ATS system literally threw up.",
      "This resume has the energy of a participation trophy.",
      "If resumes were movies, yours would go straight to DVD. In 2004.",
      "Your resume reads like a Wikipedia article nobody bothered to cite.",
      "This resume is the 'we have a candidate at home' of resumes.",
    ],
  },
  {
    minLevel: "medium",
    trigger: () => true,
    category: "overall",
    lines: [
      "I've read tax forms more exciting than this resume. And I've read a LOT of tax forms.",
      "Your resume is proof that spell check doesn't fix boring.",
      "This resume needs less buzzwords and more 'I actually did something.'",
      "If your resume were a meal, it'd be unseasoned chicken breast on a paper plate.",
      "Your resume is like a horror movie - terrifying, but for all the wrong reasons.",
      "I showed this resume to a recruiter and they asked for combat pay.",
    ],
  },
  {
    minLevel: "spicy",
    trigger: () => true,
    category: "overall",
    lines: [
      "Holy hell, did you write this resume during a damn earthquake?",
      "This resume is so bad, LinkedIn would reject it as spam. And LinkedIn accepts EVERYTHING.",
      "Whoever told you this resume was good needs to be fired. Then rehired. Then fired again.",
      "Your resume hits different. And by 'different' I mean 'like a truck full of red flags.'",
      "This resume is the professional equivalent of showing up to a job interview in Crocs.",
      "Jesus Christ, I've seen better-organized crime scenes than this resume.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.metricCount === 0,
    category: "no_metrics",
    lines: [
      "Not a single number in sight. Did you think this was a poetry reading?",
      "Your achievements section is just... vibes. Recruiters need numbers, not aura.",
      "Zero metrics. You could have made some up and it would've been an improvement.",
      "Show me the numbers! Where are the damn numbers?!",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.metricCount === 0,
    category: "no_metrics",
    lines: [
      "You managed to write an entire resume without a single measurable achievement. That's actually impressive in the worst way.",
      "Not one percentage, not one dollar figure, not one 'increased by.' What the hell did you do all day?",
      "The absence of metrics here is so complete, I'm almost in awe. It's like you're allergic to accountability.",
    ],
  },
  {
    minLevel: "spicy",
    trigger: (ctx) => ctx.metricCount === 0,
    category: "no_metrics",
    lines: [
      "Not a single goddamn metric. Did you just sit in a chair for three years and call it 'experience'?",
      "Zero numbers. Your resume is basically a long-form excuse note from your career.",
      "The sheer audacity of submitting a resume with zero metrics. I respect the delusion.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.buzzwordCount > 3,
    category: "buzzwords",
    lines: [
      `"${"{BW1}"}" and "${"{BW2}"}" in the same resume? Corporate bingo is not a skill.`,
      "Your resume reads like someone ate a LinkedIn post and threw up on a Word doc.",
      "If I had a dollar for every buzzword, I could afford to stop reading this.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.buzzwordCount > 3,
    category: "buzzwords",
    lines: [
      "You crammed so many buzzwords in here, I thought this was a Fortune 500 press release.",
      "Somewhere, a recruiter just rolled their eyes so hard they saw their own brain.",
      "Your buzzword-to-substance ratio is genuinely concerning.",
    ],
  },
  {
    minLevel: "spicy",
    trigger: (ctx) => ctx.buzzwordCount > 3,
    category: "buzzwords",
    lines: [
      "The buzzword density here could power a goddamn LinkedIn influencer for a month.",
      "I swear you just fed a thesaurus into a blender and hit 'resume mode.'",
      "Calling yourself a 'dynamic synergy-driven thought leader' isn't a personality. It's a cry for help.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.vaguePhrases.length > 0,
    category: "vague",
    lines: [
      `"Responsible for" what, exactly? Existing? Showing up?`,
      "Your bullet points have all the specificity of a horoscope.",
      "'Assisted in various tasks' - please, tell me less.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.vaguePhrases.length > 0,
    category: "vague",
    lines: [
      "'Responsible for' is doing a lot of heavy lifting here. Unfortunately, your resume isn't.",
      "These bullets are so vague, a psychic couldn't tell what you actually did.",
      "Your 'experience' section reads like a really boring mystery novel with no resolution.",
    ],
  },
  {
    minLevel: "spicy",
    trigger: (ctx) => ctx.vaguePhrases.length > 0,
    category: "vague",
    lines: [
      "'Responsible for various tasks.' That's literally the most useless sentence in the English language.",
      "Your bullets are so vague, they'd fail a background check on THEMSELVES.",
      "I've seen fortune cookies with more detail than your work history.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.bulletCount < 5,
    category: "weak_bullets",
    lines: [
      "You have fewer bullet points than a grocery list for a college student.",
      "Your resume is lighter than a rice cake and twice as bland.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.bulletCount < 5,
    category: "weak_bullets",
    lines: [
      "This resume has fewer bullet points than my morning to-do list, and mine just says 'coffee.'",
      "Did you run out of things to say or did you just give up?",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => !ctx.hasProjects,
    category: "no_projects",
    lines: [
      "No projects section? Do you even build things?",
      "Where are your side projects? Your experiments? Your 'look what I made'?",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => !ctx.hasProjects,
    category: "no_projects",
    lines: [
      "No projects section at all. What do you do outside of work, just stare at the ceiling?",
      "The absence of a projects section is deafening. It screams 'I only code when someone pays me.'",
    ],
  },
  {
    minLevel: "spicy",
    trigger: (ctx) => !ctx.hasProjects,
    category: "no_projects",
    lines: [
      "No projects? No GitHub? No portfolio? What the hell have you been doing with your life?",
      "Not a single side project. Your passion for this career could be measured with a damn microscope.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.techStack.length < 3,
    category: "generic_skills",
    lines: [
      "Your skills section is so generic, it could belong to literally anyone.",
      "Listing 'Microsoft Office' as a skill in 2024 is certainly a choice.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.techStack.length < 3,
    category: "generic_skills",
    lines: [
      "Your skill list reads like the default settings on a new laptop.",
      "I've seen more specialized skill sets on a Swiss Army knife.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => !ctx.hasSummary && ctx.wordCount > 200,
    category: "no_summary",
    lines: [
      "No summary? You just threw us in without even a 'hello'? Bold.",
      "Starting a resume without a summary is like starting a conversation mid-sentence.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => !ctx.hasSummary && ctx.wordCount > 200,
    category: "no_summary",
    lines: [
      "You skipped the summary section like it was leg day at the gym.",
      "No profile summary. The recruiter has to just... guess who you are? Cool cool cool.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.linkCount === 0,
    category: "no_links",
    lines: [
      "Not a single link? No GitHub, no LinkedIn, no portfolio. Mystery candidate.",
      "Zero URLs. In 2024. Are you in witness protection?",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.linkCount === 0,
    category: "no_links",
    lines: [
      "No links at all? Your online presence is as invisible as your resume is bland.",
      "Zero links. Either you don't have an internet presence or you're actively hiding from it.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.wordCount > 1000,
    category: "too_long",
    lines: [
      "This is a resume, not a novel. Brevity is the soul of getting hired.",
      "You wrote a small book. Recruiters spend 6 seconds. SIX. SECONDS.",
    ],
  },
  {
    minLevel: "medium",
    trigger: (ctx) => ctx.wordCount > 1000,
    category: "too_long",
    lines: [
      "Your resume is so long, it needs a table of contents and an index.",
      "I started reading this resume yesterday and I'm still not done.",
    ],
  },
  {
    minLevel: "light",
    trigger: (ctx) => ctx.wordCount < 150 && ctx.wordCount > 30,
    category: "too_short",
    lines: [
      "This resume is shorter than a tweet thread. Actually, that's an insult to tweets.",
      "Is this your resume or your Tinder bio? Either way, swipe left.",
    ],
  },
  {
    minLevel: "light",
    trigger: () => true,
    category: "finisher",
    lines: [
      "Look, I'm roasting because I care. Now go fix this thing.",
      "On the bright side, the only direction from here is up. WAY up.",
      "Your resume has potential. It's just buried under a mountain of mediocrity.",
      "The good news? You can fix all of this. The bad news? You need to fix all of this.",
    ],
  },
  {
    minLevel: "medium",
    trigger: () => true,
    category: "finisher",
    lines: [
      "I've seen worse resumes. But I had to really think about it.",
      "This resume is fixable. But we're talking renovations, not a fresh coat of paint.",
      "Take this roast, learn from it, and come back stronger. Your resume sure as hell can't come back weaker.",
    ],
  },
  {
    minLevel: "spicy",
    trigger: () => true,
    category: "finisher",
    lines: [
      "Holy hell, what a ride. Go rewrite this entire damn thing and come back when you're serious.",
      "If your career was a stock, your resume just triggered a sell-off. Time to rally.",
      "I'm done. My eyes need therapy. Go fix this abomination.",
    ],
  },
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function seededPick<T>(arr: T[], seed: number): T {
  const s = ((seed * 1103515245 + 12345) & 0x7fffffff) % arr.length;
  return arr[s];
}

export function generateRoast(text: string, roastLevel: RoastLevel): RoastResponse {
  const ctx = buildContext(text);
  const seed = simpleHash(text);
  const levelNum = LEVEL_ORDER[roastLevel];

  const eligible = TEMPLATES.filter(
    (t) => LEVEL_ORDER[t.minLevel] <= levelNum && t.trigger(ctx)
  );

  const overallTemplates = eligible.filter((t) => t.category === "overall");
  const triggeredTemplates = eligible.filter(
    (t) => t.category !== "overall" && t.category !== "finisher"
  );
  const finisherTemplates = eligible.filter((t) => t.category === "finisher");

  const roastLines: string[] = [];
  const usedCategories = new Set<string>();

  const shuffledOverall = seededShuffle(overallTemplates, seed);
  for (let i = 0; i < Math.min(2, shuffledOverall.length); i++) {
    const template = shuffledOverall[i];
    const line = seededPick(template.lines, seed + i * 7);
    roastLines.push(replacePlaceholders(line, ctx, seed + i));
  }

  const shuffledTriggered = seededShuffle(triggeredTemplates, seed + 100);
  for (const template of shuffledTriggered) {
    if (roastLines.length >= 12) break;
    if (usedCategories.has(template.category)) continue;
    usedCategories.add(template.category);
    const line = seededPick(template.lines, seed + roastLines.length * 13);
    roastLines.push(replacePlaceholders(line, ctx, seed + roastLines.length));
  }

  while (roastLines.length < 10 && triggeredTemplates.length > 0) {
    const template = seededPick(triggeredTemplates, seed + roastLines.length * 19);
    const line = seededPick(template.lines, seed + roastLines.length * 23);
    const replaced = replacePlaceholders(line, ctx, seed + roastLines.length);
    if (!roastLines.includes(replaced)) {
      roastLines.push(replaced);
    } else {
      break;
    }
  }

  const shuffledFinishers = seededShuffle(finisherTemplates, seed + 200);
  for (let i = 0; i < Math.min(2, shuffledFinishers.length); i++) {
    if (roastLines.length >= 14) break;
    const line = seededPick(shuffledFinishers[i].lines, seed + 300 + i);
    roastLines.push(replacePlaceholders(line, ctx, seed + 300 + i));
  }

  const bestIdx = (seed % Math.max(1, Math.min(roastLines.length - 2, 8))) + 1;
  const bestLine = roastLines[bestIdx] || roastLines[0] || "Your resume needs work.";

  const titles: Record<RoastLevel, string[]> = {
    light: ["A Gentle Flame", "Lightly Toasted", "The Warm-Up Act"],
    medium: ["Medium Rare Reality Check", "The Heat Is On", "No Mercy, Some Restraint"],
    spicy: ["Absolute Inferno", "Career Cremation", "The Full Scorched Earth"],
  };

  const title = seededPick(titles[roastLevel], seed);

  const allRedemptions = [
    "Add 3-5 quantified metrics to your strongest bullet points",
    "Create a projects section with links to actual work you've shipped",
    "Replace every 'responsible for' with a strong action verb + measurable result",
    "Add your GitHub/portfolio link - show, don't just tell",
    "Cut the buzzwords and replace with specific technologies and outcomes",
    "Trim your resume to one page with only your strongest achievements",
    "Write a 2-3 sentence summary that positions you clearly for your target role",
    "Rewrite your weakest bullets using the format: Verb + What + Tech + Result",
  ];

  const shuffledRedemptions = seededShuffle(allRedemptions, seed + 500);
  const redemption = shuffledRedemptions.slice(0, 3);

  const boundaries = [
    "This roast targets your resume's writing and content, not you as a person.",
    "Strong language is used for comedic effect only.",
    "No personal attacks, slurs, or discriminatory content.",
  ];

  return { title, roastLines, bestLine, redemption, boundaries };
}

function replacePlaceholders(line: string, ctx: RoastContext, seed: number): string {
  let result = line;
  if (ctx.buzzwords.length >= 2) {
    result = result.replace("{BW1}", ctx.buzzwords[0]);
    result = result.replace("{BW2}", ctx.buzzwords[1]);
  } else if (ctx.buzzwords.length === 1) {
    result = result.replace("{BW1}", ctx.buzzwords[0]);
    result = result.replace("{BW2}", "synergy");
  } else {
    result = result.replace("{BW1}", "dynamic");
    result = result.replace("{BW2}", "synergy");
  }
  return result;
}
