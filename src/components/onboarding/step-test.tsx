'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HostData } from './wizard';

interface StepTestProps {
  data: HostData;
  onNext: () => void;
  onBack: () => void;
}

const AUTH_LABELS: Record<HostData['authMethod'], string> = {
  password: 'Passwort',
  key: 'SSH-Key',
  agent: 'SSH-Agent',
};

export function StepTest({ data, onNext, onBack }: StepTestProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTest = async () => {
    setStatus('testing');
    setErrorMsg('');

    try {
      const res = await fetch('/api/hosts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: data.hostname,
          port: data.port,
          username: data.username,
          authMethod: data.authMethod,
          ...(data.authMethod === 'password' && { password: data.password }),
          ...(data.authMethod === 'key' && { privateKey: data.privateKey }),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Verbindung fehlgeschlagen');
      }

      setStatus('saving');

      // Host speichern
      const saveRes = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          hostname: data.hostname,
          port: data.port,
          username: data.username,
          authMethod: data.authMethod,
          ...(data.authMethod === 'password' && { password: data.password }),
          ...(data.authMethod === 'key' && { privateKey: data.privateKey }),
        }),
      });

      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        throw new Error(body.error || 'Host konnte nicht gespeichert werden');
      }

      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-[#c8d6e5]">Verbindung testen</h2>
        <p className="text-[13px] text-[#4a5a6e] mt-1">
          Pruefe ob die Verbindung zu deinem Host funktioniert.
        </p>
      </div>

      {/* Zusammenfassung */}
      <div className="rounded-lg border border-[#1a2028] bg-[#0a0e12] p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#8a9bb0] mb-1">
          <Server size={16} />
          <span className="text-[13px] font-medium text-[#c8d6e5]">{data.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-[12px]">
          <span className="text-[#4a5a6e]">Host</span>
          <span className="text-[#8a9bb0] font-mono">{data.username}@{data.hostname}:{data.port}</span>
          <span className="text-[#4a5a6e]">Authentifizierung</span>
          <span className="text-[#8a9bb0]">{AUTH_LABELS[data.authMethod]}</span>
        </div>
      </div>

      {/* Test-Bereich */}
      <div className="flex flex-col items-center gap-4 py-4">
        {status === 'idle' && (
          <Button variant="primary" size="lg" onClick={handleTest}>
            Verbindung testen
          </Button>
        )}

        {(status === 'testing' || status === 'saving') && (
          <div className="flex items-center gap-3 text-[#8a9bb0]">
            <Loader2 size={20} className="animate-spin text-[#22d3ee]" />
            <span className="text-[13px]">
              {status === 'testing' ? 'Verbindung wird getestet...' : 'Host wird gespeichert...'}
            </span>
          </div>
        )}

        {status === 'saved' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-[#34d399]">
              <CheckCircle size={24} />
              <span className="text-[14px] font-medium">Verbunden!</span>
            </div>
            <Button variant="primary" size="sm" onClick={onNext}>
              Weiter
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-[#f87171]">
              <XCircle size={24} />
              <span className="text-[14px] font-medium">{errorMsg}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleTest}>
                Erneut versuchen
              </Button>
              <a
                href="/help#troubleshooting"
                className="text-[12px] text-[#22d3ee] hover:underline"
              >
                Hilfe &amp; Fehlerbehebung
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#1a2028]">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={status === 'testing' || status === 'saving'}>
          Zurueck
        </Button>
        <div />
      </div>
    </div>
  );
}
