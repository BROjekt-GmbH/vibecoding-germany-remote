'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import type { Host } from '@/types';

interface HostFormProps {
  host?: Host;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HostForm({ host, onSuccess, onCancel }: HostFormProps) {
  const router = useRouter();
  const isEditing = Boolean(host);

  const [form, setForm] = useState({
    name: host?.name ?? '',
    hostname: host?.hostname ?? '',
    port: String(host?.port ?? 22),
    username: host?.username ?? '',
    authMethod: host?.authMethod ?? 'key',
    privateKey: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.hostname.trim()) errs.hostname = 'Required';
    if (!form.username.trim()) errs.username = 'Required';
    const port = parseInt(form.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) errs.port = 'Must be 1–65535';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: form.name,
      hostname: form.hostname,
      port: parseInt(form.port, 10),
      username: form.username,
      authMethod: form.authMethod,
    };
    // Beim Bearbeiten: leeren Key nicht mitsenden (= beibehalten)
    if (form.privateKey.trim()) {
      payload.privateKey = form.privateKey;
    } else if (!isEditing) {
      payload.privateKey = form.privateKey || undefined;
    }
    if (form.authMethod === 'password' && form.password) {
      payload.password = form.password;
    }
    return payload;
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const url = host ? `/api/hosts/${host.id}/test` : '/api/hosts/test';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const url = host ? `/api/hosts/${host.id}` : '/api/hosts';
      const method = host ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.refresh();
      onSuccess?.();
    } catch {
      setErrors({ _: 'Failed to save host. Check your configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => {
      const next = { ...prev, [key]: e.target.value };
      // Passwort zuruecksetzen wenn von 'password' weggewechselt wird
      if (key === 'authMethod' && e.target.value !== 'password') {
        next.password = '';
      }
      return next;
    });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Display Name"
          value={form.name}
          onChange={set('name')}
          placeholder="Work Laptop"
          error={errors.name}
        />
        <Input
          label="Hostname / IP"
          value={form.hostname}
          onChange={set('hostname')}
          placeholder="100.x.x.x"
          error={errors.hostname}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Username"
          value={form.username}
          onChange={set('username')}
          placeholder="user"
          error={errors.username}
        />
        <Input
          label="Port"
          value={form.port}
          onChange={set('port')}
          placeholder="22"
          error={errors.port}
          type="number"
          min={1}
          max={65535}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label">Auth Method</label>
        <select
          value={form.authMethod}
          onChange={set('authMethod')}
          className="input"
        >
          <option value="password">Passwort</option>
          <option value="key">SSH-Key</option>
          <option value="agent">SSH-Agent</option>
        </select>
      </div>

      {form.authMethod === 'password' && (
        <div className="flex flex-col gap-1">
          <label className="text-label">Passwort</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder={isEditing ? 'Leer lassen um beizubehalten' : 'SSH-Passwort'}
            className="input"
          />
        </div>
      )}

      {form.authMethod === 'key' && (
        <div className="flex flex-col gap-1">
          <label className="text-label">Private Key</label>
          <textarea
            value={form.privateKey}
            onChange={set('privateKey')}
            placeholder={isEditing && host?.hasKey
              ? 'Schluessel hinterlegt — leer lassen um beizubehalten'
              : '-----BEGIN OPENSSH PRIVATE KEY-----\n...'}
            rows={4}
            className="input font-mono text-[12px] resize-y"
          />
        </div>
      )}

      {errors._ && (
        <p className="text-[11px] text-[#f87171] bg-[#3a0f0f] border border-[#7f1d1d] rounded px-3 py-2">
          {errors._}
        </p>
      )}

      {testResult === 'success' && (
        <div className="flex items-center gap-2 text-[12px] text-[#34d399]">
          <CheckCircle size={13} />
          Connection successful
        </div>
      )}

      {testResult === 'error' && (
        <p className="text-[12px] text-[#f87171]">Connection failed — check credentials and firewall.</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#1a2028]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : null}
          Test Connection
        </Button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Host'}
          </Button>
        </div>
      </div>
    </form>
  );
}
