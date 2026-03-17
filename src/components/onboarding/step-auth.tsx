'use client';

import { Lock, KeyRound, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HostData } from './wizard';

interface StepAuthProps {
  data: HostData;
  onChange: (data: HostData) => void;
  onNext: () => void;
  onBack: () => void;
}

const AUTH_OPTIONS: {
  value: HostData['authMethod'];
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'password',
    label: 'Passwort',
    description: 'Am einfachsten. Dein SSH-Passwort wird verschluesselt gespeichert.',
    icon: Lock,
  },
  {
    value: 'key',
    label: 'SSH-Key',
    description: 'Sicherer. Fuege deinen privaten SSH-Schluessel ein.',
    icon: KeyRound,
  },
  {
    value: 'agent',
    label: 'SSH-Agent',
    description: 'Fuer Fortgeschrittene. Nutzt den SSH-Agent deines Systems.',
    icon: Shield,
  },
];

export function StepAuth({ data, onChange, onNext, onBack }: StepAuthProps) {
  const selectMethod = (method: HostData['authMethod']) => {
    onChange({ ...data, authMethod: method, password: '', privateKey: '' });
  };

  const canProceed =
    data.authMethod === 'agent' ||
    (data.authMethod === 'password' && !!data.password?.trim()) ||
    (data.authMethod === 'key' && !!data.privateKey?.trim());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-[#c8d6e5]">Authentifizierung</h2>
        <p className="text-[13px] text-[#4a5a6e] mt-1">
          Wie moechtest du dich mit dem Host verbinden?
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {AUTH_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const selected = data.authMethod === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectMethod(opt.value)}
              className={`flex items-start gap-4 p-4 rounded-lg border text-left transition-colors ${
                selected
                  ? 'border-[#22d3ee] bg-[#22d3ee]/5'
                  : 'border-[#1a2028] bg-[#0a0e12] hover:border-[#2d3f52]'
              }`}
            >
              <div className={`mt-0.5 ${selected ? 'text-[#22d3ee]' : 'text-[#4a5a6e]'}`}>
                <Icon size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-[13px] font-medium ${selected ? 'text-[#22d3ee]' : 'text-[#c8d6e5]'}`}>
                  {opt.label}
                </span>
                <span className="text-[12px] text-[#4a5a6e]">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Eingabefeld je nach Methode */}
      {data.authMethod === 'password' && (
        <div className="flex flex-col gap-1">
          <label className="text-label">Passwort</label>
          <input
            type="password"
            value={data.password ?? ''}
            onChange={e => onChange({ ...data, password: e.target.value })}
            placeholder="SSH-Passwort"
            className="input"
          />
        </div>
      )}

      {data.authMethod === 'key' && (
        <div className="flex flex-col gap-1">
          <label className="text-label">Privater SSH-Schluessel</label>
          <textarea
            value={data.privateKey ?? ''}
            onChange={e => onChange({ ...data, privateKey: e.target.value })}
            placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n...'}
            rows={5}
            className="input font-mono text-[12px] resize-y"
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[#1a2028]">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Zurueck
        </Button>
        <Button variant="primary" size="sm" onClick={onNext} disabled={!canProceed}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
