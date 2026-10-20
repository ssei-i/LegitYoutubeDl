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

export default function App() {
  const [url, setUrl] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
                  
    const handleDownload = () => {
      setBusy(true);
      setProgress(0);

      const res = new EventSource(`/api/download?url=${encodeURIComponent(url)}&format=${format}`)
        res.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === "progress") setProgress(msg.percent);

          if (msg.type === 'done') {
            res.close();
            setBusy(false);
            setDone(true);
            const a = document.createElement("a");
            a.href = `/api/file?name=${encodeURIComponent(msg.file)}`;
            a.download = ""
            document.body.appendChild(a)
            a.click()
            a.remove()
          }
        }
        res.onerror = (err) => {
        console.error("EventSource error:", err);
        res.close();
        setBusy(false);
      }
    }
  const [format, setFormat] = useState<string | null>("mp4");
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

  
