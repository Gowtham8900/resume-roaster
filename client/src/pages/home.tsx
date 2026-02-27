import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, Flame, TrendingUp, Copy, AlertTriangle,
  CheckCircle, XCircle, Zap, Shield, Target, Brain,
  Sparkles, ArrowRight, ChevronDown, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalyzeResponse, RoastResponse, ImproveResponse } from "../../../shared/schema";

type RoastLevel = "light" | "medium" | "spicy";

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [extractedPreview, setExtractedPreview] = useState("");
  const [inputMethod, setInputMethod] = useState<"paste" | "pdf">("paste");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [roast, setRoast] = useState<RoastResponse | null>(null);
  const [improvements, setImprovements] = useState<ImproveResponse | null>(null);
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("spicy");
  const [roastConsent, setRoastConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Extraction failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResumeText(data.text);
      setExtractedPreview(data.preview);
      toast({ title: "PDF extracted successfully", description: `${data.totalLength} characters extracted.` });
    },
    onError: (err: Error) => {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/analyze", { text, sourceType: inputMethod });
      return res.json() as Promise<AnalyzeResponse>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setRoast(null);
      setImprovements(null);
      setRoastConsent(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const roastMutation = useMutation({
    mutationFn: async ({ text, roastLevel }: { text: string; roastLevel: RoastLevel }) => {
      const res = await apiRequest("POST", "/api/roast", { text, roastLevel });
      return res.json() as Promise<RoastResponse>;
    },
    onSuccess: (data) => setRoast(data),
    onError: (err: Error) => {
      toast({ title: "Roast failed", description: err.message, variant: "destructive" });
    },
  });

  const improveMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/improve", { text });
      return res.json() as Promise<ImproveResponse>;
    },
    onSuccess: (data) => setImprovements(data),
    onError: (err: Error) => {
      toast({ title: "Improvement generation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      extractMutation.mutate(file);
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  }, []);

  const getScoreColor = (score: number) => {
    if (score <= 3) return "text-red-500";
    if (score <= 6) return "text-amber-500";
    return "text-emerald-500";
  };

  const getScoreBg = (score: number) => {
    if (score <= 3) return "from-red-500/10 to-red-600/5";
    if (score <= 6) return "from-amber-500/10 to-amber-600/5";
    return "from-emerald-500/10 to-emerald-600/5";
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">Resume Roaster</h1>
              <p className="text-xs text-muted-foreground">No AI. No BS. Pure rule-based analysis.</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-no-llm">
            <Shield className="w-3 h-3 mr-1" />
            Zero LLM
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="text-center space-y-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="text-hero-title">
              Upload your resume.
              <br />
              <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
                Get scored. Get roasted.
              </span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
              Deterministic analysis powered by pattern matching and heuristics.
              No AI hallucinations. No API keys. Just honest, rule-based feedback.
            </p>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Tabs
                value={inputMethod}
                onValueChange={(v) => setInputMethod(v as "paste" | "pdf")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="paste" className="flex-1" data-testid="tab-paste">
                    <FileText className="w-4 h-4 mr-2" />
                    Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="flex-1" data-testid="tab-pdf">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="mt-4">
                  <Textarea
                    placeholder="Paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm resize-y"
                    data-testid="input-resume-text"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {resumeText.length.toLocaleString()} / 20,000 characters
                  </p>
                </TabsContent>

                <TabsContent value="pdf" className="mt-4">
                  <div
                    className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-pdf"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="input-pdf-file"
                    />
                    {extractMutation.isPending ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Extracting text from PDF...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Click to upload a PDF resume</p>
                          <p className="text-sm text-muted-foreground">Max 10MB. Text-based PDFs only.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {extractedPreview && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Extracted Preview</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(resumeText)}
                          data-testid="button-copy-extracted"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy All
                        </Button>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap line-clamp-6" data-testid="text-extracted-preview">
                        {extractedPreview}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button
                onClick={() => analyzeMutation.mutate(resumeText)}
                disabled={!resumeText.trim() || resumeText.trim().length < 50 || analyzeMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-analyze"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        <AnimatePresence>
          {analysis && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground px-3">Analysis Results</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`md:col-span-1 bg-gradient-to-br ${getScoreBg(analysis.score)}`}>
                  <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-1">AI Replacement Risk</p>
                    <div className={`text-7xl font-bold tracking-tighter ${getScoreColor(analysis.score)}`} data-testid="text-risk-score">
                      {analysis.score}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">out of 10</p>
                    <Badge
                      variant={analysis.score <= 3 ? "destructive" : analysis.score <= 6 ? "secondary" : "default"}
                      className="mt-3"
                      data-testid="badge-risk-label"
                    >
                      {analysis.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => copyToClipboard(`My AI Replacement Risk Score: ${analysis.score}/10 (${analysis.label}) - Resume Roaster`)}
                      data-testid="button-copy-score"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Share Score
                    </Button>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm leading-relaxed" data-testid="text-summary">{analysis.summary}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <StatBox icon={<FileText className="w-4 h-4" />} label="Words" value={analysis.detected.wordCount.toString()} testId="stat-words" />
                      <StatBox icon={<Target className="w-4 h-4" />} label="Bullets" value={analysis.detected.bulletCount.toString()} testId="stat-bullets" />
                      <StatBox icon={<TrendingUp className="w-4 h-4" />} label="Metrics" value={analysis.detected.metricCount.toString()} testId="stat-metrics" />
                      <StatBox icon={<Sparkles className="w-4 h-4" />} label="Links" value={analysis.detected.linkCount.toString()} testId="stat-links" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.breakdown.map((item, i) => (
                    <div key={item.name} className="space-y-1.5" data-testid={`breakdown-item-${i}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className={`text-sm font-bold ${item.score >= 70 ? "text-emerald-500" : item.score >= 40 ? "text-amber-500" : "text-red-500"}`}>
                          {item.score}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${getBarColor(item.score)}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`strength-${i}`}>
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Red Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.redFlags.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`redflag-${i}`}>
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground px-3">What's Next?</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary/20">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      <h3 className="font-bold">Roast My Resume (Rated R)</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get a brutally honest, comedic roast of your resume's writing and content.
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">Heat level:</span>
                      <div className="flex gap-1">
                        {(["light", "medium", "spicy"] as RoastLevel[]).map((level) => (
                          <Button
                            key={level}
                            variant={roastLevel === level ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setRoastLevel(level)}
                            data-testid={`button-roast-level-${level}`}
                          >
                            {level === "light" && "Mild"}
                            {level === "medium" && "Medium"}
                            {level === "spicy" && "Spicy"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md">
                      <Checkbox
                        id="roast-consent"
                        checked={roastConsent}
                        onCheckedChange={(checked) => setRoastConsent(!!checked)}
                        data-testid="checkbox-roast-consent"
                      />
                      <label htmlFor="roast-consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                        I understand this is a comedic roast of my resume text and may include strong language.
                      </label>
                    </div>

                    <Button
                      onClick={() => roastMutation.mutate({ text: resumeText, roastLevel })}
                      disabled={!roastConsent || roastMutation.isPending}
                      className="w-full"
                      variant={roastConsent ? "default" : "secondary"}
                      data-testid="button-roast"
                    >
                      {roastMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Roasting...</>
                      ) : (
                        <><Flame className="w-4 h-4 mr-2" />Roast It</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-chart-5/20">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-chart-5" />
                      <h3 className="font-bold">How Can I Improve?</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get actionable rewrites, priority fixes, and ATS tips grounded in your actual resume content.
                    </p>

                    <Button
                      onClick={() => improveMutation.mutate(resumeText)}
                      disabled={improveMutation.isPending}
                      className="w-full"
                      variant="secondary"
                      data-testid="button-improve"
                    >
                      {improveMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><TrendingUp className="w-4 h-4 mr-2" />Get Improvements</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <AnimatePresence>
                {roast && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="border-primary/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Flame className="w-5 h-5 text-primary" />
                          {roast.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {roast.roastLines.map((line, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`p-3 rounded-md text-sm ${
                                line === roast.bestLine
                                  ? "bg-primary/10 border border-primary/20 font-medium"
                                  : "bg-muted/30"
                              }`}
                              data-testid={`roast-line-${i}`}
                            >
                              {line === roast.bestLine && (
                                <Badge variant="default" className="mb-2 text-xs">Best Line</Badge>
                              )}
                              <p>{line}</p>
                            </motion.div>
                          ))}
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-chart-5" />
                            Redemption Corner
                          </h4>
                          <ul className="space-y-2">
                            {roast.redemption.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`redemption-${i}`}>
                                <ArrowRight className="w-4 h-4 text-chart-5 mt-0.5 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground italic">
                            {roast.boundaries.join(" ")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {improvements && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="border-chart-5/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-chart-5" />
                          Improvement Plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Priority Fixes (Ordered by Impact)
                          </h4>
                          <ol className="space-y-2">
                            {improvements.priorityFixes.map((fix, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm" data-testid={`fix-${i}`}>
                                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span>{fix}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {improvements.rewrittenBullets.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Bullet Rewrites
                            </h4>
                            <div className="space-y-4">
                              {improvements.rewrittenBullets.map((bullet, i) => (
                                <div key={i} className="space-y-2" data-testid={`bullet-rewrite-${i}`}>
                                  <div className="p-3 bg-red-500/5 rounded-md border border-red-500/10">
                                    <p className="text-xs font-medium text-red-500 mb-1">Before</p>
                                    <p className="text-sm">{bullet.before}</p>
                                  </div>
                                  <div className="flex justify-center">
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="p-3 bg-emerald-500/5 rounded-md border border-emerald-500/10">
                                    <p className="text-xs font-medium text-emerald-500 mb-1">After</p>
                                    <p className="text-sm">{bullet.after}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Improved Summary
                          </h4>
                          <div className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm leading-relaxed" data-testid="text-improved-summary">{improvements.improvedSummary}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => copyToClipboard(improvements.improvedSummary)}
                            data-testid="button-copy-summary"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Summary
                          </Button>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            ATS Tips
                          </h4>
                          <ul className="space-y-2">
                            {improvements.atsTips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`ats-tip-${i}`}>
                                <CheckCircle className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {analysis.disclaimers.length > 0 && (
                <div className="text-center space-y-1 py-4">
                  {analysis.disclaimers.map((d, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{d}</p>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!analysis && (
          <section className="py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FeatureCard
                icon={<Zap className="w-5 h-5 text-primary" />}
                title="Instant Analysis"
                description="Get a detailed breakdown of your resume's strengths and weaknesses in seconds."
                testId="feature-analysis"
              />
              <FeatureCard
                icon={<Flame className="w-5 h-5 text-chart-2" />}
                title="Comedic Roasts"
                description="Choose your heat level and get a brutally funny critique of your resume's writing."
                testId="feature-roast"
              />
              <FeatureCard
                icon={<TrendingUp className="w-5 h-5 text-chart-5" />}
                title="Actionable Fixes"
                description="Receive priority fixes, bullet rewrites, and ATS tips based on your actual content."
                testId="feature-improve"
              />
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Resume Roaster uses zero AI/LLM technology. All analysis is deterministic and rule-based.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30" data-testid={testId}>
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, testId }: { icon: React.ReactNode; title: string; description: string; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6 space-y-2">
        {icon}
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
