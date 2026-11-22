import { useRef, useState } from 'react';
import { Mic, Square, Languages, AlertTriangle } from 'lucide-react';
import { useToast } from './Toast';

interface Props {
  onApply: (original: string, translated: string, language: string) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const LANGUAGES: { code: string; label: string; recognitionSupport: 'good' | 'partial' }[] = [
  { code: 'te-IN', label: 'Telugu', recognitionSupport: 'good' },
  { code: 'hi-IN', label: 'Hindi', recognitionSupport: 'good' },
  { code: 'ta-IN', label: 'Tamil', recognitionSupport: 'good' },
  { code: 'kn-IN', label: 'Kannada', recognitionSupport: 'partial' },
  { code: 'mr-IN', label: 'Marathi', recognitionSupport: 'partial' },
  { code: 'bn-IN', label: 'Bengali', recognitionSupport: 'partial' },
  { code: 'gu-IN', label: 'Gujarati', recognitionSupport: 'partial' },
  { code: 'ml-IN', label: 'Malayalam', recognitionSupport: 'partial' },
  { code: 'en-IN', label: 'English (India)', recognitionSupport: 'good' },
];


export default function VoiceReporter({ onApply }: Props) {
  const toast = useToast();
  const [language, setLanguage] = useState('te-IN');
  const [listening, setListening] = useState(false);
  const [original, setOriginal] = useState('');
  const [translated, setTranslated] = useState('');
  const [translating, setTranslating] = useState(false);
  const [supported, setSupported] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechWindow = window as SpeechRecognitionWindow;
  const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

  function start() {
    if (!consentGiven) {
      toast('Please tick the consent box before recording.', 'error');
      return;
    }
    if (!SpeechRecognition) {
      setSupported(false);
      toast('Speech recognition is not available in this browser. Please type your description instead.', 'error');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = language;
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = original;
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setOriginal(finalText + interim);
    };
    rec.onerror = (e: SpeechRecognitionErrorLike) => {
      toast(`Speech recognition error: ${e.error}. You can type manually instead.`, 'error');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setOriginal(original.endsWith(' ') || original === '' ? original : original + ' ');
    rec.start();
    setListening(true);
    toast(`Listening in ${LANGUAGES.find((l) => l.code === language)?.label}...`, 'info');
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function translate() {
    if (!original.trim()) {
      toast('Record or type something in the original transcript first.', 'error');
      return;
    }
    setTranslating(true);
    try {
      const translatedText = await translateViaLibre(original, language);
      setTranslated(translatedText);
      toast('Translation complete. Review both texts below.', 'success');
    } catch {
      toast(
        'Automatic translation is unavailable right now (free service limit). Please review the original transcript and describe the issue in English in the description box.',
        'error'
      );
    } finally {
      setTranslating(false);
    }
  }

  function apply() {
    if (!original.trim()) {
      toast('Nothing to apply — record or type your complaint first.', 'error');
      return;
    }
    onApply(original.trim(), translated.trim(), language);
    toast('Voice report added to the complaint form.', 'success');
  }

  return (
    <div className="card p-4 border-l-4 border-l-[var(--teal-600)]">
      <h3 className="font-semibold text-[var(--navy-800)] flex items-center gap-2">
        <Mic size={18} /> Report by Voice
      </h3>
      <p className="text-xs text-[var(--neutral-600)] mt-1">
        Speak in your own language. Your words are kept in the original language and a machine translation is prepared
        for officials. You can correct both texts before submitting.
      </p>

      {!supported && (
        <div className="mt-3 flex items-start gap-2 text-sm text-[var(--warning)] bg-[#fdf3e0] rounded-lg p-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            Voice input needs a browser with speech recognition (Chrome or Edge). You can still record a voice note and
            type the description manually.
          </span>
        </div>
      )}

      <div className="mt-3 grid sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="label" htmlFor="voice-lang">Step 1 — Your language</label>
          <select id="voice-lang" className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
                {l.recognitionSupport === 'partial' ? ' (recognition may vary)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {!listening ? (
            <button type="button" className="btn-danger flex-1" onClick={start} disabled={!supported}>
              <Mic size={16} /> Step 2 — Start recording
            </button>
          ) : (
            <button type="button" className="btn-success flex-1" onClick={stop}>
              <Square size={16} /> Stop recording
            </button>
          )}
          <button type="button" className="btn-teal flex-1" onClick={translate} disabled={translating || listening}>
            <Languages size={16} /> {translating ? 'Translating…' : 'Step 4 — Translate'}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 mt-3 text-xs text-[var(--neutral-600)]">
        <input
          type="checkbox"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          className="mt-0.5"
        />
        I agree to my speech being converted to text for this complaint. Recording happens only while the microphone is
        on; no audio is stored by the speech service after transcription.
      </label>

      <div className="mt-3 grid md:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="voice-original">Step 3 & 5 — Original transcript ({LANGUAGES.find((l) => l.code === language)?.label})</label>
          <textarea
            id="voice-original"
            className="input min-h-[90px]"
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="What you spoke appears here — you can correct it."
          />
        </div>
        <div>
          <label className="label" htmlFor="voice-translated">Machine translation (review before submitting)</label>
          <textarea
            id="voice-translated"
            className="input min-h-[90px]"
            value={translated}
            onChange={(e) => setTranslated(e.target.value)}
            placeholder="The English translation appears here — you can correct it."
          />
        </div>
      </div>

      <button type="button" className="btn-primary mt-3" onClick={apply} disabled={!original.trim()}>
        Use this in my complaint
      </button>
    </div>
  );
}

// Free-tier machine translation via LibreTranslate public instance.
// Limitation: the fully public endpoints are rate-limited / occasionally down.
// If translation fails, the UI clearly says so and keeps the original text —
// no paid API is used. A self-hosted or key-based service can be swapped in
// later without changing this interface.
async function translateViaLibre(text: string, sourceLang: string): Promise<string> {
  const target = 'en';
  const endpoints = [
    'https://translate.fedilab.app/translate',
    'https://libretranslate.de/translate',
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang.split('-')[0],
          target,
          format: 'text',
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (typeof data.translatedText === 'string' && data.translatedText.trim()) {
        return data.translatedText;
      }
    } catch {
      // try next endpoint
    }
  }
  throw new Error('translation-unavailable');
}
