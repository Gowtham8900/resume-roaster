import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import { analyzeResume } from "./lib/analyzer";
import { generateRoast } from "./lib/roaster";
import { generateImprovements } from "./lib/improver";
import { rateLimit } from "./lib/rateLimit";
import { analyzeInputSchema, roastInputSchema, improveInputSchema } from "../shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/extract", rateLimit, (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ error: err.message || "Invalid file upload." });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(req.file.buffer);
      const text = data.text || "";

      if (text.length < 100) {
        return res.status(422).json({
          error: "PDF appears to be image-based or contains very little text. Please paste your resume text instead.",
          extractedLength: text.length,
        });
      }

      return res.json({
        text: text.substring(0, 20000),
        preview: text.substring(0, 800),
        totalLength: text.length,
      });
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      return res.status(500).json({
        error: "Failed to extract text from PDF. Please try pasting your resume text instead.",
      });
    }
  });

  app.post("/api/analyze", rateLimit, (req, res) => {
    try {
      const parsed = analyzeInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      }

      const { text } = parsed.data;
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ error: "Resume text is too short. Please provide at least 50 characters." });
      }

      const result = analyzeResume(text);
      return res.json(result);
    } catch (error: any) {
      console.error("Analysis error:", error);
      return res.status(500).json({ error: "Analysis failed. Please try again." });
    }
  });

  app.post("/api/roast", rateLimit, (req, res) => {
    try {
      const parsed = roastInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      }

      const { text, roastLevel } = parsed.data;
      if (text.trim().length < 50) {
        return res.status(400).json({ error: "Resume text is too short to roast." });
      }

      const result = generateRoast(text, roastLevel);
      return res.json(result);
    } catch (error: any) {
      console.error("Roast error:", error);
      return res.status(500).json({ error: "Roast generation failed. Please try again." });
    }
  });

  app.post("/api/improve", rateLimit, (req, res) => {
    try {
      const parsed = improveInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      }

      const { text } = parsed.data;
      if (text.trim().length < 50) {
        return res.status(400).json({ error: "Resume text is too short to improve." });
      }

      const result = generateImprovements(text);
      return res.json(result);
    } catch (error: any) {
      console.error("Improve error:", error);
      return res.status(500).json({ error: "Improvement generation failed. Please try again." });
    }
  });

  return httpServer;
}
