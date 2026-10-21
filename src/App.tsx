import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {useState} from "react";
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
const API = import.meta.env.VITE_API_URL;
const TOKEN = import.meta.env.VITE_API_TOKEN;

export default function App() {
  const [url, setUrl] = useState<string>("");
  const [format, setFormat] = useState<string | null>("mp4");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    if (!url.trim()) return;
    setBusy(true);
    setProgress(0);
    setError(null);

    const es = new EventSource(
      `${API}/api/download?url=${encodeURIComponent(url)}&format=${format}&token=${TOKEN}`
    );

    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "progress") setProgress(msg.percent);

      if (msg.type === "done") {
        es.close();
        setBusy(false);
        setDone(true);
        const a = document.createElement("a");
        a.href = `${API}/api/file?name=${encodeURIComponent(msg.file)}&token=${TOKEN}`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      if (msg.type === "error") {
        es.close();
        setBusy(false);
        setError(msg.message ?? "Something went wrong");
      }
    };

    es.onerror = () => {
      es.close();
      setBusy(false);
      setError("Could not reach the server (is it running?)");
    };
  };

  return (
    <div>
      {done && <Alert className="text-white max-w-md mx-auto mt-4">
        <AlertTitle>NOT a youtube downloader</AlertTitle>
        <AlertDescription>
          Downloader is done NOT downloading
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" onClick={() => setDone(false)} disabled={!done}>
            Reset
          </Button>
        </AlertAction>
      </Alert>}
        {error && (
          <Alert className="text-white max-w-md mx-auto mt-4">
              <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" onClick={() => setError(null)}>Dismiss</Button>
          </AlertAction>
      </Alert>)}
      <div className="flex h-screen items-center justify-center">
        <div>
          <Field>
            <FieldLabel>Not A YouTube Downloader</FieldLabel>
            <FieldDescription>Enter the YouTube URL you want to not download</FieldDescription>
            <div className="flex flex-row gap-2">
              <Input
              placeholder="Enter URL..." className="w-full max-w-md"
              value={url}
              onChange={(e) => setUrl(e.target.value)} />

              <Select value={format} onValueChange={setFormat}> 
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="format" />
                  </SelectTrigger>  
                <SelectContent>
                 <SelectItem value="mp3">mp3</SelectItem>
                 <SelectItem value="mp4">mp4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-red-500 text-white hover:bg-red-900 rounded-md" onClick={handleDownload} disabled={busy}>
              Don't Download
            </Button>
            {busy && <Progress value={progress} className="w-full max-h-2 max-w-md mt-2" />}
          </Field>
        </div>
      </div>
    </div>
  )
} 

  
