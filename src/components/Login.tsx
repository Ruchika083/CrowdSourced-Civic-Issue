import { useState } from 'react';
import type { FormEvent } from 'react';
import { Landmark, LogIn, UserPlus } from 'lucide-react';
import type { Level, Official } from '../types';
import { useToast } from './Toast';

interface Props {
  onCitizenLogin: (name: string, email: string) => void;
  onOfficialLogin: (official: Official) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export default function Login({ onCitizenLogin, onOfficialLogin }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<'citizen' | 'official'>('citizen');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [designation, setDesignation] = useState<Level>('Ward');
  const [department, setDepartment] = useState('Road');

  function submitCitizen(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return toast('Please enter a valid email address.', 'error');
    if (password.length < 6) return toast('Password must be at least 6 characters.', 'error');
    if (isRegister) {
      if (name.trim().length < 2) return toast('Please enter your full name.', 'error');
      if (!PHONE_RE.test(phone.replace(/\s/g, '')))
        return toast('Please enter a valid 10-digit Indian mobile number.', 'error');
      onCitizenLogin(name.trim(), email.trim());
      toast('Account created. Welcome to Civic Talk!', 'success');
    } else {
      onCitizenLogin(name.trim() || 'Citizen', email.trim());
      toast('Signed in. Welcome back!', 'success');
    }
  }

  function submitOfficial(e: FormEvent) {
    e.preventDefault();
    if (officialName.trim().length < 2) return toast('Please enter the official\'s name.', 'error');
    if (!EMAIL_RE.test(officialEmail)) return toast('Please enter a valid government email address.', 'error');
    onOfficialLogin({ name: officialName.trim(), email: officialEmail.trim(), designation, department });
    toast('Signed in to the Official Portal.', 'success');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--navy-900)] via-[var(--navy-800)] to-[var(--teal-600)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-3">
            <Landmark size={32} />
          </div>
          <h1 className="text-3xl font-bold">Civic Talk</h1>
          <p className="text-white/80 text-sm mt-1">Report issues, make a difference</p>
        </div>
        <div className="card p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-[var(--neutral-100)] rounded-lg">
            <button
              className={`py-2 rounded-md text-sm font-medium transition-colors ${mode === 'citizen' ? 'bg-white shadow text-[var(--navy-800)]' : 'text-[var(--neutral-600)]'}`}
              onClick={() => { setMode('citizen'); setIsRegister(false); }}
            >
              Citizen
            </button>
            <button
              className={`py-2 rounded-md text-sm font-medium transition-colors ${mode === 'official' ? 'bg-white shadow text-[var(--navy-800)]' : 'text-[var(--neutral-600)]'}`}
              onClick={() => setMode('official')}
            >
              Official
            </button>
          </div>

          {mode === 'citizen' ? (
            <form onSubmit={submitCitizen} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="label" htmlFor="ct-name">Full name</label>
                    <input id="ct-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="ct-phone">Mobile number</label>
                    <input id="ct-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" inputMode="numeric" />
                  </div>
                </>
              )}
              <div>
                <label className="label" htmlFor="ct-email">Email</label>
                <input id="ct-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="label" htmlFor="ct-password">Password</label>
                <input id="ct-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <button type="submit" className="btn-primary w-full">
                <LogIn size={16} /> {isRegister ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => setIsRegister((r) => !r)}
              >
                <UserPlus size={16} /> {isRegister ? 'I already have an account' : 'New citizen? Register here'}
              </button>
              <p className="text-xs text-[var(--neutral-600)] text-center">
                Demo sign-in: any valid email and a 6+ character password. Registration is simulated and not a secure account system.
              </p>
            </form>
          ) : (
            <form onSubmit={submitOfficial} className="space-y-4">
              <div>
                <label className="label" htmlFor="of-name">Name</label>
                <input id="of-name" className="input" value={officialName} onChange={(e) => setOfficialName(e.target.value)} placeholder="e.g. Mr. Ward Officer" required />
              </div>
              <div>
                <label className="label" htmlFor="of-email">Official email</label>
                <input id="of-email" className="input" type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} placeholder="ward.road@visakha.gov" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="of-desig">Administrative level</label>
                  <select id="of-desig" className="input" value={designation} onChange={(e) => setDesignation(e.target.value as Level)}>
                    <option value="Ward">Ward Level</option>
                    <option value="Zone">Zone Level</option>
                    <option value="City">City Level</option>
                    <option value="IAS">IAS Officer</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="of-dept">Department</label>
                  <select id="of-dept" className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="Road">Road</option>
                    <option value="Sanitation">Sanitation</option>
                    <option value="Water">Water</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <LogIn size={16} /> Sign in to Official Portal
              </button>
              <p className="text-xs text-[var(--neutral-600)] text-center">
                Official access is role-simulated for this demo: choose the level and department you want to review.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
