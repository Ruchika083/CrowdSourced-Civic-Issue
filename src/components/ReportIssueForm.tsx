import { useRef, useState } from 'react';
import { Camera, Upload, MapPin, Mic } from 'lucide-react';
import type { Issue } from '../types';
import { SUB_ISSUES, VIZAG_AREAS, departmentFor } from '../types';
import { submitIssue } from '../lib/data';
import { useToast } from './Toast';
import VoiceReporter from './VoiceReporter';

interface Props {
  onSubmitted: (issue: Issue) => void;
}

export default function ReportIssueForm({ onSubmitted }: Props) {
  const toast = useToast();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [originalTranscript, setOriginalTranscript] = useState<string | null>(null);
  const [translatedTranscript, setTranslatedTranscript] = useState<string | null>(null);
  const [transcriptLanguage, setTranscriptLanguage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [geoInfo, setGeoInfo] = useState<string | null>(null);

  const subOptions = issueType ? SUB_ISSUES[issueType] : undefined;
  const [subIssue, setSubIssue] = useState('');

  function fullType(): string {
    if (subOptions && subIssue) return `${issueType} - ${subIssue}`;
    return issueType;
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image is too large. Please choose one under 5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch {
      toast('Could not access the camera. Check permissions or upload a photo instead.', 'error');
    }
  }

  function snapPhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setImage(canvas.toDataURL('image/jpeg'));
    closeCamera();
    captureGeo();
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function captureGeo() {
    if (!navigator.geolocation) return;
    setGeoInfo('Getting coordinates…');
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeoInfo(
          `Captured near ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        ),
      () => setGeoInfo('Could not read device location — please pick the area manually.')
    );
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudio(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        toast('Voice note attached. It will be stored with the complaint.', 'success');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast('Could not access the microphone. Check browser permissions.', 'error');
    }
  }

  async function handleSubmit() {
    if (!issueType) return toast('Please select the type of issue.', 'error');
    if (!subOptions || subIssue) {
      // ok
    } else {
      return toast('Please specify the sub-category of the issue.', 'error');
    }
    if (!area) return toast('Please select the area / locality.', 'error');
    if (!description.trim() && !originalTranscript) return toast('Please describe the problem (type or use voice).', 'error');
    if (!image) return toast('Please provide a photo as evidence (upload or camera).', 'error');

    setSubmitting(true);
    try {
      const issue = await submitIssue({
        issueType: fullType(),
        description: description.trim() || `(Voice report — see original transcript)`,
        area,
        landmark: landmark.trim(),
        image,
        audio,
        originalTranscript,
        translatedTranscript,
        transcriptLanguage,
      });
      toast(`Complaint ${issue.id} submitted successfully.`, 'success');
      onSubmitted(issue);
      // reset form
      setIssueType(''); setSubIssue(''); setDescription(''); setArea(''); setLandmark('');
      setImage(null); setAudio(null); setGeoInfo(null);
      setOriginalTranscript(null); setTranslatedTranscript(null); setTranscriptLanguage(null);
    } catch (err) {
      toast('Could not save the complaint: ' + (err instanceof Error ? err.message : 'unknown error'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <VoiceReporter
        onApply={(original, translated, lang) => {
          setOriginalTranscript(original);
          setTranslatedTranscript(translated || null);
          setTranscriptLanguage(lang);
          if (translated) setDescription(translated);
        }}
      />

      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="ri-type">Type of issue</label>
            <select id="ri-type" className="input" value={issueType} onChange={(e) => { setIssueType(e.target.value); setSubIssue(''); }}>
              <option value="">-- Select an issue type --</option>
              <option value="Sanitation">Sanitation — garbage, drains, cleanliness</option>
              <option value="Road Issue">Road Issue — potholes, streetlights, obstacles</option>
              <option value="Water">Water — pipe leaks, supply problems</option>
              <option value="Other">Other — miscellaneous</option>
            </select>
          </div>
          {subOptions && (
            <div>
              <label className="label" htmlFor="ri-sub">Specify</label>
              <select id="ri-sub" className="input" value={subIssue} onChange={(e) => setSubIssue(e.target.value)}>
                <option value="">-- Specify --</option>
                {subOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="ri-area">Area / locality</label>
            <select id="ri-area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">-- Select an area --</option>
              {Object.keys(VIZAG_AREAS).sort().map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ri-landmark">Address details / landmark</label>
            <input id="ri-landmark" className="input" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Near Post Office, Main Road" />
          </div>
        </div>

        {geoInfo && (
          <div className="text-sm bg-[var(--teal-100)] border-l-4 border-[var(--teal-600)] rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPin size={16} /> {geoInfo}
          </div>
        )}

        <div>
          <span className="label">Photo evidence (required)</span>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Upload photo
            </button>
            <button type="button" className="btn-ghost" onClick={openCamera}>
              <Camera size={16} /> Take photo
            </button>
            <button type="button" className={recording ? 'btn-success' : 'btn-ghost'} onClick={toggleRecording}>
              <Mic size={16} /> {recording ? 'Stop voice note' : audio ? 'Re-record voice note' : 'Record voice note'}
            </button>
          </div>
          {image && (
            <div className="mt-3">
              <img src={image} alt="Evidence preview" className="rounded-lg border border-[var(--neutral-300)] max-h-56" />
              <button type="button" className="text-xs text-[var(--danger)] mt-1 underline" onClick={() => setImage(null)}>
                Remove photo
              </button>
            </div>
          )}
          {audio && (
            <div className="mt-3">
              <p className="text-xs text-[var(--neutral-600)] mb-1">Voice note attached:</p>
              <audio controls src={audio} className="w-full max-w-sm" />
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="ri-desc">Description</label>
          <textarea
            id="ri-desc"
            className="input min-h-[110px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem — what, where since when…"
          />
          {originalTranscript && (
            <p className="text-xs text-[var(--teal-600)] mt-1">
              Voice report attached. Officials will see your original {transcriptLanguage === 'en-IN' ? 'English' : 'language'} transcript alongside its English translation.
            </p>
          )}
        </div>

        <button type="button" className="btn-primary w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit issue'}
        </button>
        <p className="text-xs text-[var(--neutral-600)]">
          Routing: this complaint will go to the <strong>{issueType ? departmentFor(fullType()) : '—'}</strong> Department at Ward level.
        </p>
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-[1500] bg-black/60 flex items-center justify-center p-4" onClick={closeCamera}>
          <div className="card p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">Take photo</h3>
            <video ref={videoRef} autoPlay playsInline className="rounded-lg w-full" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 mt-3">
              <button type="button" className="btn-primary flex-1" onClick={snapPhoto}>Snap photo</button>
              <button type="button" className="btn-ghost" onClick={closeCamera}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
