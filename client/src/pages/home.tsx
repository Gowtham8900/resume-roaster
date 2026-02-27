import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { playFireSound, primeAudio } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, Flame, TrendingUp, Copy, AlertTriangle,
  CheckCircle, XCircle, Zap, Target, Brain,
  Sparkles, ArrowRight, ChevronDown, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalyzeResponse, RoastResponse, ImproveResponse } from "../../../shared/schema";

type RoastLevel = "light" | "medium" | "spicy";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(59, 130, 246, 0.0)",
      "0 0 40px rgba(59, 130, 246, 0.15)",
      "0 0 20px rgba(59, 130, 246, 0.0)",
    ],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  }
};

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const startTime = Date.now();
    const ms = duration * 1000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ms, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);
      if (progress >= 1) clearInterval(timer);
    }, 30);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display}</>;
}

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [extractedPreview, setExtractedPreview] = useState("");
  const [inputMethod, setInputMethod] = useState<"paste" | "pdf">("paste");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [roast, setRoast] = useState<RoastResponse | null>(null);
  const [improvements, setImprovements] = useState<ImproveResponse | null>(null);
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("spicy");
  const [roastConsent, setRoastConsent] = useState(false);
  const [showScore, setShowScore] = useState(false);
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
      setShowScore(false);
      setAnalysis(data);
      setRoast(null);
      setImprovements(null);
      setRoastConsent(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          setShowScore(true);
          playFireSound();
        }, 400);
      }, 100);
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
    onSuccess: (data) => {
      setRoast(data);
      playFireSound();
    },
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
    if (score <= 3) return "text-red-400";
    if (score <= 6) return "text-amber-400";
    return "text-emerald-400";
  };

  const getScoreGlow = (score: number) => {
    if (score <= 3) return "drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]";
    if (score <= 6) return "drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]";
    return "drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]";
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getBarGlow = (score: number) => {
    if (score >= 70) return "shadow-[0_0_8px_rgba(16,185,129,0.4)]";
    if (score >= 40) return "shadow-[0_0_8px_rgba(245,158,11,0.4)]";
    return "shadow-[0_0_8px_rgba(239,68,68,0.4)]";
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <header className="border-b border-border/50 bg-card/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <motion.div
            className="w-9 h-9 rounded-md bg-primary flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Flame className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <h1 className="text-lg font-bold tracking-tight" data-testid="text-app-title">Resume Roaster</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 relative z-10">
        <section className="text-center space-y-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div
              className="inline-block mb-4"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                <Flame className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl" data-testid="text-hero-title">
              Upload your resume.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Get scored. Get roasted.
              </span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Instant feedback on your resume. No sign-up required.
            </p>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div {...pulseGlow}>
            <Card className="border-primary/20">
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
                      className="min-h-[200px] font-mono text-sm resize-y bg-background/50"
                      data-testid="input-resume-text"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {resumeText.length.toLocaleString()} / 20,000 characters
                    </p>
                  </TabsContent>

                  <TabsContent value="pdf" className="mt-4">
                    <div
                      className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer transition-all duration-300 hover:border-primary/60 hover:bg-primary/5"
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
                      <div className="mt-4 p-3 bg-muted/30 rounded-md border border-border/50">
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
                  onClick={() => { primeAudio(); analyzeMutation.mutate(resumeText); }}
                  disabled={!resumeText.trim() || resumeText.trim().length < 50 || analyzeMutation.isPending}
                  className="w-full relative overflow-hidden group"
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
                      <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                      Analyze Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>

        <AnimatePresence>
          {analysis && (
            <motion.div
              ref={resultsRef}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.div variants={itemVariants} className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="text-sm font-medium text-primary px-3">Analysis Results</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-1 border-primary/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <CardContent className="pt-6 flex flex-col items-center justify-center text-center relative">
                    <p className="text-sm font-medium text-muted-foreground mb-2">AI Replacement Risk</p>
                    <AnimatePresence>
                      {showScore && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0, rotate: -180 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.8 }}
                          className={`${getScoreColor(analysis.score)} ${getScoreGlow(analysis.score)}`}
                          data-testid="text-risk-score"
                        >
                          <span className="text-8xl font-bold tracking-tighter">
                            <AnimatedCounter value={analysis.score} duration={1.2} />
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.p
                      className="text-xs text-muted-foreground mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: showScore ? 1 : 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      out of 10
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: showScore ? 1 : 0, scale: showScore ? 1 : 0.8 }}
                      transition={{ delay: 0.8, type: "spring" }}
                    >
                      <Badge
                        variant={analysis.score <= 3 ? "destructive" : analysis.score <= 6 ? "secondary" : "default"}
                        className="mt-3"
                        data-testid="badge-risk-label"
                      >
                        {analysis.label}
                      </Badge>
                    </motion.div>
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
                    <motion.p
                      className="text-sm leading-relaxed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      data-testid="text-summary"
                    >
                      {analysis.summary}
                    </motion.p>

                    <motion.div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div variants={itemVariants}>
                        <StatBox icon={<FileText className="w-4 h-4" />} label="Words" value={analysis.detected.wordCount} testId="stat-words" />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatBox icon={<Target className="w-4 h-4" />} label="Bullets" value={analysis.detected.bulletCount} testId="stat-bullets" />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatBox icon={<TrendingUp className="w-4 h-4" />} label="Metrics" value={analysis.detected.metricCount} testId="stat-metrics" />
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <StatBox icon={<Sparkles className="w-4 h-4" />} label="Links" value={analysis.detected.linkCount} testId="stat-links" />
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.breakdown.map((item, i) => (
                      <div key={item.name} className="space-y-1.5" data-testid={`breakdown-item-${i}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className={`text-sm font-bold ${item.score >= 70 ? "text-emerald-400" : item.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                            {item.score}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getBarColor(item.score)} ${getBarGlow(item.score)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.score}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.08 }}
                          data-testid={`strength-${i}`}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Red Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.redFlags.map((f, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.08 }}
                          data-testid={`redflag-${i}`}
                        >
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="text-sm font-medium text-primary px-3">What's Next?</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary/20 group">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Flame className="w-5 h-5 text-primary" />
                      </motion.div>
                      <h3 className="font-bold">Roast My Resume</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get a brutally honest, comedic roast of your resume's writing and content.
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
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

                    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md border border-border/30">
                      <Checkbox
                        id="roast-consent"
                        checked={roastConsent}
                        onCheckedChange={(checked) => setRoastConsent(!!checked)}
                        data-testid="checkbox-roast-consent"
                      />
                      <label htmlFor="roast-consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                        I understand this is a comedic roast and may include strong language.
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
                      Get actionable rewrites, priority fixes, and ATS tips based on your resume.
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
              </motion.div>

              <AnimatePresence>
                {roast && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    <Card className="border-primary/30">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: 2 }}
                          >
                            <Flame className="w-5 h-5 text-primary" />
                          </motion.div>
                          {roast.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {roast.roastLines.map((line, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ delay: i * 0.08, type: "spring", stiffness: 150 }}
                              className={`p-3 rounded-md text-sm ${
                                line === roast.bestLine
                                  ? "bg-primary/15 border border-primary/30 font-medium"
                                  : "bg-muted/20 border border-border/30"
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

                        <div className="pt-4 border-t border-border/50">
                          <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-chart-5" />
                            Redemption Corner
                          </h4>
                          <ul className="space-y-2">
                            {roast.redemption.map((r, i) => (
                              <motion.li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.06 }}
                                data-testid={`redemption-${i}`}
                              >
                                <ArrowRight className="w-4 h-4 text-chart-5 mt-0.5 shrink-0" />
                                <span>{r}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-3 border-t border-border/50">
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card>
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
                            Priority Fixes
                          </h4>
                          <ol className="space-y-2">
                            {improvements.priorityFixes.map((fix, i) => (
                              <motion.li
                                key={i}
                                className="flex items-start gap-3 text-sm"
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                data-testid={`fix-${i}`}
                              >
                                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <span>{fix}</span>
                              </motion.li>
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
                                <motion.div
                                  key={i}
                                  className="space-y-2"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 + i * 0.1 }}
                                  data-testid={`bullet-rewrite-${i}`}
                                >
                                  <div className="p-3 bg-red-500/10 rounded-md border border-red-500/20">
                                    <p className="text-xs font-medium text-red-400 mb-1">Before</p>
                                    <p className="text-sm">{bullet.before}</p>
                                  </div>
                                  <div className="flex justify-center">
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                    <p className="text-xs font-medium text-emerald-400 mb-1">After</p>
                                    <p className="text-sm">{bullet.after}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Improved Summary
                          </h4>
                          <div className="p-3 bg-muted/20 rounded-md border border-border/30">
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
                            <CheckCircle className="w-4 h-4" />
                            ATS Tips
                          </h4>
                          <ul className="space-y-2">
                            {improvements.atsTips.map((tip, i) => (
                              <motion.li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                data-testid={`ats-tip-${i}`}
                              >
                                <CheckCircle className="w-4 h-4 text-chart-4 mt-0.5 shrink-0" />
                                <span>{tip}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {!analysis && (
          <motion.section
            className="py-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div variants={itemVariants}>
                <FeatureCard
                  icon={<Zap className="w-5 h-5 text-primary" />}
                  title="Instant Analysis"
                  description="Get a detailed breakdown of your resume's strengths and weaknesses in seconds."
                  testId="feature-analysis"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <FeatureCard
                  icon={<Flame className="w-5 h-5 text-chart-2" />}
                  title="Comedic Roasts"
                  description="Choose your heat level and get a brutally funny critique of your resume."
                  testId="feature-roast"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <FeatureCard
                  icon={<TrendingUp className="w-5 h-5 text-chart-5" />}
                  title="Actionable Fixes"
                  description="Receive priority fixes, bullet rewrites, and ATS tips based on your content."
                  testId="feature-improve"
                />
              </motion.div>
            </div>
          </motion.section>
        )}
      </main>

      <footer className="border-t border-border/30 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Resume Roaster
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: number; testId: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/20 border border-border/30" data-testid={testId}>
      <div className="text-primary/70">{icon}</div>
      <div>
        <p className="text-lg font-bold leading-none">
          <AnimatedCounter value={value} duration={1} />
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, testId }: { icon: React.ReactNode; title: string; description: string; testId: string }) {
  return (
    <Card className="border-border/30 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5" data-testid={testId}>
      <CardContent className="pt-6 space-y-2">
        {icon}
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
