'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderPlus, Trash2, Edit3 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useFileBrowser } from '@/lib/stores/file-browser';

// ─── Neue Datei ──────────────────────────────────────────

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFileDialog({ open, onClose }: NewFileDialogProps) {
  const { createFile, currentPath } = useFileBrowser();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dateiname ist erforderlich');
      return;
    }
    setError('');
    setLoading(true);
    const ok = await createFile(name.trim(), content);
    setLoading(false);
    if (ok) {
      setName('');
      setContent('');
      onClose();
    } else {
      setError('Erstellen fehlgeschlagen');
    }
  };

  const handleClose = () => {
    setName('');
    setContent('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Neue Datei erstellen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-[11px] text-[#4a5a6e] font-mono">
          Verzeichnis: {currentPath}
        </div>
        <Input
          label="DATEINAME"
          placeholder="z.B. config.json"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label className="text-label text-[11px] text-[#4a5a6e]">INHALT (OPTIONAL)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input font-mono text-[12px] min-h-[100px] resize-y"
            placeholder="Datei-Inhalt..."
            spellCheck={false}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Plus size={12} />}
            Erstellen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Neuer Ordner ─────────────────────────────────────────

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFolderDialog({ open, onClose }: NewFolderDialogProps) {
  const { createFolder, currentPath } = useFileBrowser();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ordnername ist erforderlich');
      return;
    }
    setError('');
    setLoading(true);
    const ok = await createFolder(name.trim());
    setLoading(false);
    if (ok) {
      setName('');
      onClose();
    } else {
      setError('Erstellen fehlgeschlagen');
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Neuer Ordner">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-[11px] text-[#4a5a6e] font-mono">
          Verzeichnis: {currentPath}
        </div>
        <Input
          label="ORDNERNAME"
          placeholder="z.B. config"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <FolderPlus size={12} />}
            Erstellen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Loeschen ────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  path: string;
  onClose: () => void;
}

export function DeleteDialog({ open, path, onClose }: DeleteDialogProps) {
  const { deleteEntry } = useFileBrowser();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const ok = await deleteEntry(path);
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Eintrag loeschen?">
      <div className="flex flex-col gap-4">
        <p className="text-[12px] text-[#c8d6e5]">
          Soll der Eintrag wirklich endgueltig geloescht werden?
        </p>
        <code className="text-[11px] text-[#f87171] font-mono bg-[#1a2028] px-2 py-1.5 rounded-sm break-all">
          {path}
        </code>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Trash2 size={12} />}
            Loeschen
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ─── Umbenennen ───────────────────────────────────────────

interface RenameDialogProps {
  open: boolean;
  path: string;
  onClose: () => void;
}

export function RenameDialog({ open, path, onClose }: RenameDialogProps) {
  const { renameEntry } = useFileBrowser();
  const currentName = path.split('/').pop() ?? '';
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Name bei erneutem Oeffnen synchronisieren
  useEffect(() => {
    if (open) {
      setName(path.split('/').pop() ?? '');
      setError('');
    }
  }, [open, path]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }
    if (name.trim() === currentName) {
      onClose();
      return;
    }
    setError('');
    setLoading(true);
    const ok = await renameEntry(path, name.trim());
    setLoading(false);
    if (ok) {
      onClose();
    } else {
      setError('Umbenennen fehlgeschlagen');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Umbenennen"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <div className="text-[11px] text-[#4a5a6e] font-mono truncate">
          {path}
        </div>
        <Input
          label="NEUER NAME"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Edit3 size={12} />}
            Umbenennen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
