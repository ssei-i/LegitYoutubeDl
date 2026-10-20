import express from "express";
import { YtDlp, type FormatOptions, type FormatTable, type TypeOptions } from 'ytdlp-nodejs';
import fs from "fs";
import path from "path";
import os from "os";

const ytdlp = new YtDlp();

const app = express();

const downloadsDir = path.join(os.tmpdir(), "yt-downloads");
fs.mkdirSync(downloadsDir, { recursive: true });

app.get("/api/download", async (req, res) => {
  const url = req.query.url as string;

  const format = req.query.format === "mp3" ? "mp3" : "mp4";

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

  if (!url) {  
    return res.status(400).json({ error: "URL parameter is required" });
  }
  res.set({
    'Content-Type': 'text/event-stream',
    'cache-control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);  

  try{
    const result = 
      await builder
      .embedThumbnail()
      .on('progress', (p) => {
          console.log(p);
          const percent = typeof p.percentage === 'number'
          ? p.percentage
          : parseFloat(String(p.percentage_str ?? '0').replace('%', ''));
          send({ type: 'progress', percent: Math.round(percent) });
      })
      .run();
    
    send({ type: 'done', file: path.basename(result.filePaths[0]) });
  }
  catch (error) {
    console.error("Error downloading video:", error);
    res.status(500).json({ error: "Failed to download video" });
  } 
});

app.get("/api/file", (req, res) => {
  const name = path.basename(String(req.query.name ?? ""));
  const filePath = path.join(downloadsDir, name);

  res.download(filePath, name, () => {
    fs.promises.unlink(filePath).catch(() => {});
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});