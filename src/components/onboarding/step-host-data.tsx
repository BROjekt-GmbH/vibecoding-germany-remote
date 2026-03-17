'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HostData } from './wizard';

interface StepHostDataProps {
  data: HostData;
  onChange: (data: HostData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepHostData({ data, onChange, onNext, onBack }: StepHostDataProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof HostData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === 'port' ? Number(e.target.value) : e.target.value;
    onChange({ ...data, [key]: value });
    // Fehler beim Tippen entfernen
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!data.name.trim()) errs.name = 'Pflichtfeld';
    if (!data.hostname.trim()) errs.hostname = 'Pflichtfeld';
    if (!data.username.trim()) errs.username = 'Pflichtfeld';
    if (data.port < 1 || data.port > 65535) errs.port = 'Port muss zwischen 1 und 65535 liegen';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-[#c8d6e5]">Host-Daten</h2>
        <p className="text-[13px] text-[#4a5a6e] mt-1">
          Gib die Verbindungsdaten deines Remote-Hosts ein.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Input
            label="Anzeigename"
            value={data.name}
            onChange={set('name')}
            placeholder="z.B. Mein Server"
            error={errors.name}
          />
          <p className="text-[11px] text-[#4a5a6e] mt-1">
            Ein beliebiger Name zur Identifikation deines Hosts.
          </p>
        </div>

        <div>
          <Input
            label="Hostname / IP"
            value={data.hostname}
            onChange={set('hostname')}
            placeholder="z.B. 100.64.0.1 oder server.example.com"
            error={errors.hostname}
          />
          <p className="text-[11px] text-[#4a5a6e] mt-1">
            Die IP-Adresse oder der Hostname deines Servers.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Benutzername"
              value={data.username}
              onChange={set('username')}
              placeholder="z.B. root"
              error={errors.username}
            />
            <p className="text-[11px] text-[#4a5a6e] mt-1">
              Der SSH-Benutzername fuer die Anmeldung.
            </p>
          </div>

          <div>
            <Input
              label="Port"
              type="number"
              value={String(data.port)}
              onChange={set('port')}
              placeholder="22"
              error={errors.port}
              min={1}
              max={65535}
            />
            <p className="text-[11px] text-[#4a5a6e] mt-1">
              Standard ist 22. Nur aendern wenn noetig.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#1a2028]">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Zurueck
        </Button>
        <Button variant="primary" size="sm" onClick={handleNext}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
