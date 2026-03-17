# UI-Vereinfachung + Onboarding + SSH-Passwort — Implementierungsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel-System entfernen, SSH-Passwort-Auth hinzufuegen, Onboarding-Wizard und Hilfe-Seite erstellen.

**Architecture:** Panel-System (Floating Windows) wird komplett entfernt, Navigation geht auf Hauptseiten. SSH-Passwort als dritte Auth-Methode mit AES-256-GCM Verschluesselung. Wizard erscheint automatisch auf leerem Dashboard. Hilfe-Seite als statische Seite mit Anchor-Links.

**Tech Stack:** Next.js 16, React 19, TypeScript, SQLite (Drizzle ORM), ssh2, Tailwind CSS 4, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-17-ui-simplification-design.md`

**Arbeitsverzeichnis:** `/home/silence/Projects/vibecoding-germany-remote`

---

## Chunk 1: Panel-System entfernen

### Task 1: Panel-Dateien loeschen und Kern-Referenzen bereinigen

**Files:**
- Delete: `src/components/panels/` (gesamtes Verzeichnis)
- Delete: `src/lib/stores/panel-manager.ts`
- Delete: `src/types/panels.ts`
- Delete: `src/components/layout/quick-action-bar.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/hooks/use-keyboard-shortcuts.ts`
- Modify: `src/components/command-palette/command-palette.tsx`

- [ ] **Step 1: Panel-Verzeichnis und Store/Types loeschen**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
rm -rf src/components/panels/
rm -f src/lib/stores/panel-manager.ts
rm -f src/types/panels.ts
rm -f src/components/layout/quick-action-bar.tsx
```

- [ ] **Step 2: layout.tsx — WorkspaceOverlay entfernen**

Aus `src/app/layout.tsx`:
- Import `WorkspaceOverlay` entfernen
- `<WorkspaceOverlay />` Render entfernen

- [ ] **Step 3: header.tsx — QuickActionBar entfernen, Suche in Header**

Aus `src/components/layout/header.tsx`:
- `QuickActionBar` Import entfernen
- `<QuickActionBar />` durch einen einfachen Ctrl+K Suchbutton ersetzen:

```tsx
{/* Mitte — Suche (Command Palette) */}
<button
  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm text-[12px] text-[#4a5a6e] hover:text-[#8a9bb0] border border-[#1a2028] hover:border-[#2a3a48] transition-colors"
>
  <Search size={14} />
  <span>Suche</span>
  <kbd className="ml-2 text-[10px] text-[#3a4a5a] bg-[#0b0e11] px-1.5 py-0.5 rounded">Ctrl+K</kbd>
</button>
```

`Search` aus lucide-react importieren.

- [ ] **Step 4: use-keyboard-shortcuts.ts — Panel-Shortcuts entfernen**

Aus `src/hooks/use-keyboard-shortcuts.ts`:
- Alle `usePanelManager` Imports entfernen
- Panel-Shortcut-Logik entfernen (Ctrl+1..4, Ctrl+Shift+M)
- Escape-Handler: Panel-Logik entfernen, nur Command-Palette-Close behalten
- Sidebar-Toggle (Ctrl+B) bleibt

- [ ] **Step 5: command-palette.tsx — Panel-Befehle entfernen**

Aus `src/components/command-palette/command-palette.tsx`:
- `usePanelManager` Import entfernen
- `togglePanel` Destrukturierung entfernen
- "Panels" Gruppe komplett entfernen (CommandGroup mit Panel-Items)
- Navigation-Items bleiben

- [ ] **Step 6: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: Panel-System und Quick-Action-Bar entfernt"
```

---

### Task 2: Panel-Referenzen in allen Seiten und Komponenten bereinigen

**Files:**
- Modify: alle Dateien mit Panel-Referenzen (siehe grep)

- [ ] **Step 1: Alle Panel-Referenzen finden**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
grep -rn 'panel\|PanelId\|usePanelManager\|panel-manager\|WorkspaceOverlay\|workspace-overlay\|openPanel\|togglePanel\|PANEL_DEFAULTS' src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

- [ ] **Step 2: Jede gefundene Datei bereinigen**

Fuer jede Datei:
- Panel-Store-Imports entfernen (`import { usePanelManager }`)
- Panel-Type-Imports entfernen (`import type { PanelId }`)
- `usePanelManager()` Hooks und Destrukturierungen entfernen
- Button-Click-Handler die `openPanel()` / `togglePanel()` aufrufen: durch `router.push('/...')` ersetzen oder Button entfernen
- Panel-bezogene CSS-Klassen in `globals.css` entfernen

Bekannte Dateien (aus Spec):
- `src/app/page.tsx`
- `src/app/hosts/page.tsx`, `src/app/hosts/[hostId]/page.tsx`
- `src/app/projects/page.tsx`, `src/app/projects/[id]/page.tsx`
- `src/app/files/page.tsx`
- `src/app/terminal/page.tsx`
- `src/app/settings/page.tsx`
- `src/components/host/host-card.tsx`
- `src/components/host/session-list.tsx`
- `src/components/files/context-menu.tsx`
- `src/components/files/file-viewer.tsx`
- `src/components/files/file-tree.tsx`
- `src/components/files/file-search.tsx`
- `src/components/terminal/layout-selector.tsx`
- `src/components/layout/notification-center.tsx`
- `src/lib/stores/terminal-tab-events.ts`
- `src/app/globals.css`

- [ ] **Step 3: TypeCheck**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
npx tsc --noEmit 2>&1 | head -50
```

Alle Fehler beheben bis TypeCheck sauber ist.

- [ ] **Step 4: Pruefen dass keine Panel-Referenzen mehr existieren**

```bash
grep -rn 'panel\|PanelId\|usePanelManager\|panel-manager\|WorkspaceOverlay\|openPanel\|togglePanel' src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "// panel"
```

Ergebnis sollte leer sein.

- [ ] **Step 5: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "fix: Alle Panel-Referenzen aus Seiten und Komponenten bereinigt"
```

---

## Chunk 2: SSH-Passwort-Authentifizierung

### Task 3: Schema, Types und SSH-Client fuer Passwort-Auth

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/ssh/types.ts`
- Modify: `src/lib/ssh/client.ts`
- Modify: `src/lib/ssh/pool.ts`

- [ ] **Step 1: Schema — password Spalte hinzufuegen**

In `src/lib/db/schema.ts`, in der `hosts` Tabelle nach `privateKey`:

```typescript
password: text('password'), // AES-256-GCM verschluesselt
```

Kommentar bei `authMethod` aktualisieren:
```typescript
authMethod: text('auth_method').notNull().default('key'), // 'key' | 'agent' | 'password'
```

- [ ] **Step 2: Migration generieren**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
npx drizzle-kit generate
```

- [ ] **Step 3: Types — Host Interface erweitern**

In `src/types/index.ts`, im `Host` Interface:
- `authMethod` Typ aendern: `authMethod: 'key' | 'agent' | 'password';`
- Neues Feld: `hasPassword: boolean;`

- [ ] **Step 4: SSH-Types — SSHConfig erweitern**

In `src/lib/ssh/types.ts`, im `SSHConfig` Interface:
```typescript
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  agent?: string;
  password?: string;  // NEU
}
```

- [ ] **Step 5: SSH-Client — Drei-Wege-Auth**

`src/lib/ssh/client.ts` umschreiben mit expliziter Drei-Wege-Unterscheidung:

```typescript
import { db } from '../db';
import { hosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sshPool } from './pool';
import { decrypt } from '../crypto';
import type { SSHConfig } from './types';

export async function getHostSSHConfig(hostId: string): Promise<SSHConfig> {
  const result = await db.select().from(hosts).where(eq(hosts.id, hostId)).limit(1);
  if (!result[0]) throw new Error(`Host not found: ${hostId}`);

  const h = result[0];
  const base = { host: h.hostname, port: h.port, username: h.username };

  if (h.authMethod === 'agent') {
    return { ...base, agent: process.env.SSH_AUTH_SOCK };
  }

  if (h.authMethod === 'password') {
    return { ...base, password: h.password ? decrypt(h.password) : undefined };
  }

  // Default: key
  return { ...base, privateKey: h.privateKey ? decrypt(h.privateKey) : undefined };
}

export async function execOnHost(hostId: string, command: string): Promise<string> {
  const config = await getHostSSHConfig(hostId);
  return sshPool.exec(hostId, config, command);
}
```

- [ ] **Step 6: SSH-Pool — password an ssh2 weitergeben**

In `src/lib/ssh/pool.ts`, in der `createConnection` Methode, im `.connect()` Aufruf:

```typescript
.connect({
  host: config.host,
  port: config.port,
  username: config.username,
  privateKey: config.privateKey,
  agent: config.agent,
  password: config.password,  // NEU
  keepaliveInterval: this.KEEPALIVE_INTERVAL,
  keepaliveCountMax: 3,
  readyTimeout: 20_000,
});
```

- [ ] **Step 7: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: SSH-Passwort-Auth — Schema, Types, Client"
```

---

### Task 4: Validation, Sanitize und API-Routes fuer Passwort

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/api/sanitize.ts`
- Modify: `src/app/api/hosts/route.ts`
- Modify: `src/app/api/hosts/[id]/route.ts`
- Modify: `src/app/api/hosts/test/route.ts`

- [ ] **Step 1: Validation — password und authMethod erweitern**

In `src/lib/validation.ts`:

```typescript
export const CreateHostSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authMethod: z.enum(['key', 'agent', 'password']).default('key'),
  privateKey: z.string().optional(),
  password: z.string().optional(),
});
```

- [ ] **Step 2: Sanitize — password rausfiltern**

```typescript
// src/lib/api/sanitize.ts
import type { hosts } from '@/lib/db/schema';

type HostRow = typeof hosts.$inferSelect;

export function sanitizeHost(host: HostRow) {
  const { privateKey, password, ...rest } = host;
  return { ...rest, hasKey: Boolean(privateKey), hasPassword: Boolean(password) };
}
```

- [ ] **Step 3: hosts/route.ts — password beim POST verschluesseln**

In `src/app/api/hosts/route.ts`, im POST-Handler nach der Validierung:

```typescript
const data = { ...parsed.data };
if (data.privateKey) {
  data.privateKey = encrypt(data.privateKey);
}
if (data.password) {
  data.password = encrypt(data.password);
}
```

- [ ] **Step 4: hosts/[id]/route.ts — password beim PATCH verschluesseln**

In `src/app/api/hosts/[id]/route.ts`, im PATCH-Handler:

```typescript
const data = { ...parsed.data };
if (data.privateKey) {
  data.privateKey = encrypt(data.privateKey);
}
if (data.password) {
  data.password = encrypt(data.password);
}

const hasKeyChange = data.privateKey !== undefined || data.password !== undefined;
```

- [ ] **Step 5: Test-Route — authMethod und password unterstuetzen**

`src/app/api/hosts/test/route.ts` — TestSchema erweitern:

```typescript
const TestSchema = z.object({
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authMethod: z.enum(['key', 'agent', 'password']).default('key'),
  privateKey: z.string().optional(),
  password: z.string().optional(),
});
```

Und im connect-Aufruf je nach authMethod:

```typescript
const connectConfig: Record<string, unknown> = {
  host: data.hostname,
  port: data.port,
  username: data.username,
  readyTimeout: 10_000,
};

if (data.authMethod === 'password' && data.password) {
  connectConfig.password = data.password;
} else if (data.authMethod === 'agent') {
  connectConfig.agent = process.env.SSH_AUTH_SOCK;
} else if (data.privateKey) {
  connectConfig.privateKey = data.privateKey;
}

client.connect(connectConfig);
```

- [ ] **Step 6: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: SSH-Passwort-Auth — Validation, Sanitize, API-Routes"
```

---

### Task 5: Host-Formular — Passwort-Option

**Files:**
- Modify: `src/components/host/host-form.tsx`

- [ ] **Step 1: State fuer password hinzufuegen**

Neuer State: `const [password, setPassword] = useState('');`

Beim Edit-Mode initialisieren: Password bleibt leer (wird nie vom Server zurueckgegeben).

- [ ] **Step 2: authMethod-Dropdown um 'password' erweitern**

```tsx
<select value={authMethod} onChange={(e) => setAuthMethod(e.target.value as 'key' | 'agent' | 'password')}>
  <option value="password">Passwort</option>
  <option value="key">SSH-Key</option>
  <option value="agent">SSH-Agent</option>
</select>
```

- [ ] **Step 3: Passwort-Eingabefeld (sichtbar wenn authMethod === 'password')**

```tsx
{authMethod === 'password' && (
  <div>
    <label>Passwort</label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder={host ? 'Leer lassen um beizubehalten' : 'SSH-Passwort'}
    />
  </div>
)}
```

- [ ] **Step 4: buildPayload() um password erweitern**

In der `buildPayload()` Funktion:

```typescript
function buildPayload() {
  const payload: Record<string, unknown> = {
    name, hostname, port, username, authMethod,
  };

  if (authMethod === 'key' && privateKey) {
    payload.privateKey = privateKey;
  }
  if (authMethod === 'password' && password) {
    payload.password = password;
  }

  return payload;
}
```

- [ ] **Step 5: handleTest() — authMethod und password mitsenden**

Im Test-Payload `authMethod` und `password` hinzufuegen:

```typescript
const testPayload = { hostname, port, username, authMethod, privateKey, password };
```

- [ ] **Step 6: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: Host-Formular mit Passwort-Option"
```

---

## Chunk 3: Hilfe-Seite und Sidebar

### Task 6: Sidebar — Hilfe-Eintrag + Hilfe-Seite

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Create: `src/app/help/page.tsx`

- [ ] **Step 1: Sidebar — Hilfe-Eintrag hinzufuegen**

In `src/components/layout/sidebar.tsx`:

`CircleHelp` zu den lucide-react Imports hinzufuegen.

Im `navItems` Array, vor Settings:

```typescript
{ label: 'Hilfe', path: '/help', icon: CircleHelp },
```

- [ ] **Step 2: Hilfe-Seite erstellen**

Erstelle `src/app/help/page.tsx` — statische Seite mit allen Sektionen aus der Spec.

Die Seite soll:
- Alle Sektionen als HTML/JSX rendern (kein Markdown-Parser noetig)
- Anchor-IDs pro Sektion fuer direkte Verlinkung (`id="ssh"`, `id="tmux"`, `id="tailscale"`, `id="troubleshooting"`)
- Inhaltsverzeichnis oben mit Sprunglinks
- Code-Bloecke fuer Befehle (`<code>` / `<pre>`)
- Gleiches Dark-Theme wie der Rest der App

Sektionen:
1. **Was ist VCG Remote?** (`id="about"`)
2. **SSH-Grundlagen** (`id="ssh"`)
3. **tmux** (`id="tmux"`)
4. **Tailscale** (`id="tailscale"`)
5. **Host einrichten** (`id="host-setup"`)
6. **Troubleshooting / FAQ** (`id="troubleshooting"`)

- [ ] **Step 3: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: Hilfe-Seite und Sidebar-Eintrag"
```

---

## Chunk 4: Onboarding-Wizard

### Task 7: Onboarding-Wizard Komponenten

**Files:**
- Create: `src/components/onboarding/wizard.tsx`
- Create: `src/components/onboarding/step-welcome.tsx`
- Create: `src/components/onboarding/step-host-data.tsx`
- Create: `src/components/onboarding/step-auth.tsx`
- Create: `src/components/onboarding/step-test.tsx`
- Create: `src/components/onboarding/step-done.tsx`

- [ ] **Step 1: wizard.tsx — Container-Komponente**

```tsx
'use client';

import { useState } from 'react';
import { StepWelcome } from './step-welcome';
import { StepHostData } from './step-host-data';
import { StepAuth } from './step-auth';
import { StepTest } from './step-test';
import { StepDone } from './step-done';

interface HostData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  authMethod: 'key' | 'agent' | 'password';
  privateKey?: string;
  password?: string;
}

const INITIAL_HOST: HostData = {
  name: '', hostname: '', port: 22, username: '', authMethod: 'password',
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [hostData, setHostData] = useState<HostData>(INITIAL_HOST);

  const steps = [
    <StepWelcome key="welcome" onNext={() => setStep(1)} />,
    <StepHostData key="host" data={hostData} onChange={setHostData} onNext={() => setStep(2)} onBack={() => setStep(0)} />,
    <StepAuth key="auth" data={hostData} onChange={setHostData} onNext={() => setStep(3)} onBack={() => setStep(1)} />,
    <StepTest key="test" data={hostData} onNext={() => setStep(4)} onBack={() => setStep(2)} />,
    <StepDone key="done" onAddMore={() => { setHostData(INITIAL_HOST); setStep(1); }} />,
  ];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {[0,1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#22d3ee]' : 'bg-[#1a2028]'}`} />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}
```

- [ ] **Step 2: step-welcome.tsx**

Willkommens-Schritt mit Erklaerung und "Los geht's" Button.

- [ ] **Step 3: step-host-data.tsx**

Formular fuer Name, Hostname, Port, Username mit Hilfe-Texten.

- [ ] **Step 4: step-auth.tsx**

Drei Auth-Optionen als Cards (Passwort, SSH-Key, SSH-Agent) mit je passender Eingabe.

- [ ] **Step 5: step-test.tsx**

Verbindung testen — ruft `POST /api/hosts/test` auf, bei Erfolg speichert per `POST /api/hosts`, zeigt Feedback. Link zu `/help#troubleshooting` bei Fehler.

- [ ] **Step 6: step-done.tsx**

Erfolgs-Meldung mit "Zum Terminal" und "Weiteren Host hinzufuegen" Buttons.

- [ ] **Step 7: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: Onboarding-Wizard Komponenten"
```

---

### Task 8: Dashboard — Wizard bei leerer Host-Liste

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Dashboard — Host-Count pruefen und Wizard anzeigen**

In `src/app/page.tsx`:

- Import: `OnboardingWizard` aus `@/components/onboarding/wizard`
- Im useEffect der Seite: `fetch('/api/hosts')` und Host-Count pruefen
- Neuer State: `const [hasHosts, setHasHosts] = useState<boolean | null>(null);`
- Loading-State waehrend der Pruefung
- Wenn `hasHosts === false`: `<OnboardingWizard />` rendern
- Wenn `hasHosts === true`: normales Dashboard rendern

```tsx
// Nach dem fetch:
const hosts = await res.json();
setHasHosts(hosts.length > 0);
```

- [ ] **Step 2: Commit**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "feat: Dashboard zeigt Wizard wenn keine Hosts konfiguriert"
```

---

## Chunk 5: Abschluss

### Task 9: Abschluss-Checks

- [ ] **Step 1: TypeCheck**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
npx tsc --noEmit 2>&1 | head -80
```

- [ ] **Step 2: ESLint**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
npm run lint 2>&1 | head -50
```

- [ ] **Step 3: Build**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
npm run build 2>&1 | tail -30
```

- [ ] **Step 4: Verbleibende Referenzen pruefen**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
# Panel-Referenzen
grep -rn 'usePanelManager\|WorkspaceOverlay\|panel-manager\|PanelId' src/ --include="*.ts" --include="*.tsx"

# Alle neuen Features vorhanden
ls src/app/help/page.tsx
ls src/components/onboarding/wizard.tsx
grep -n "password" src/lib/db/schema.ts
grep -n "CircleHelp" src/components/layout/sidebar.tsx
```

- [ ] **Step 5: Migration testen**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
rm -f data/app.db
npx tsx server/migrate.ts
echo "Migration OK"
```

- [ ] **Step 6: Finaler Commit und Push**

```bash
cd /home/silence/Projects/vibecoding-germany-remote
git add -A && git commit -m "fix: Abschluss-Checks bestanden" && git push
```

---

## Zusammenfassung der Tasks

| Task | Beschreibung | Abhaengigkeiten |
|------|-------------|-----------------|
| 1 | Panel-Dateien loeschen + Kern-Referenzen | — |
| 2 | Panel-Referenzen in allen Seiten bereinigen | 1 |
| 3 | SSH-Passwort Schema + Types + Client | — |
| 4 | SSH-Passwort API-Routes + Validation | 3 |
| 5 | Host-Formular Passwort-Option | 4 |
| 6 | Hilfe-Seite + Sidebar-Eintrag | — |
| 7 | Onboarding-Wizard Komponenten | 5 |
| 8 | Dashboard Wizard-Integration | 7 |
| 9 | Abschluss-Checks | alle |

**Parallelisierbar:** Tasks 1+3+6 koennen parallel nach Start laufen.
