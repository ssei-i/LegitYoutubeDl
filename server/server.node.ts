import express from "express";
import cors from "cors";
import { YtDlp } from "ytdlp-nodejs";
import fs from "fs";
import path from "path";
import os from "os";

const ytdlp = new YtDlp();
const app = express();

app.use(
  cors({
    origin: ["https://legit-youtube-ao17ylhw7-seina2.vercel.app/", "http://localhost:5173"],
  })
);
app.use(express.json());

const downloadsDir = path.join(os.tmpdir(), "yt-downloads");
fs.mkdirSync(downloadsDir, { recursive: true });

const API_TOKEN = process.env.API_TOKEN; // set this before starting the server

// simple auth (token via query because EventSource can't send headers)
app.use("/api", (req, res, next) => {
  if (API_TOKEN && req.query.token !== API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

let activeJobs = 0;
const MAX_JOBS = 2;

app.get("/api/download", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  const format = req.query.format === "mp3" ? "mp3" : "mp4";

  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {}
  if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) {
    return res.status(400).json({ error: "A valid YouTube URL is required" });
  }
  if (activeJobs >= MAX_JOBS) {
    return res.status(429).json({ error: "Server busy, try again shortly" });
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const ping = setInterval(() => res.write(": ping\n\n"), 20000);

  const output = path.join(downloadsDir, "%(title)s.%(ext)s");
  const builder =
    format === "mp3"
      ? ytdlp.download(url, {
          format: { filter: "audioonly", quality: 5, type: "mp3" },
          output,
        })
      : ytdlp.download(url, {
          format: { filter: "mergevideo", quality: "1080p", type: "mp4" },
          output,
        });

  activeJobs++;
  try {
    const result = await builder
      .embedThumbnail()
      .on("progress", (p) => {
        const percent =
          typeof p.percentage === "number"
            ? p.percentage
            : parseFloat(String(p.percentage_str ?? "0").replace("%", ""));
        send({ type: "progress", percent: Math.round(percent) });
      })
      .run();

    send({ type: "done", file: path.basename(result.filePaths[0]) });
  } catch (error) {
    console.error("Error downloading video:", error);
    send({ type: "error", message: "Failed to download video" });
  } finally {
    activeJobs--;
    clearInterval(ping);
    res.end();
  }
});

app.get("/api/file", (req, res) => {
  const name = path.basename(String(req.query.name ?? ""));
  const filePath = path.join(downloadsDir, name);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.download(filePath, name, () => {
    fs.promises.unlink(filePath).catch(() => {});
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});