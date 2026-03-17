import { CircleHelp } from 'lucide-react';

const tocItems = [
  { id: 'about', label: 'Was ist VCG Remote?' },
  { id: 'ssh', label: 'SSH-Grundlagen' },
  { id: 'tmux', label: 'tmux' },
  { id: 'tailscale', label: 'Tailscale' },
  { id: 'host-setup', label: 'Host einrichten' },
  { id: 'troubleshooting', label: 'Troubleshooting / FAQ' },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-[#0b0e11] border border-[#1a2028] text-[#22d3ee] px-1.5 py-0.5 rounded text-[13px] font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0b0e11] border border-[#1a2028] rounded-md p-4 text-[13px] font-mono text-[#8a9bb0] overflow-x-auto my-3">
      {children}
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-12">
      <h2 className="text-lg font-semibold text-[#c9d6e3] mb-4 pb-2 border-b border-[#1a2028]">
        {title}
      </h2>
      <div className="text-[#8a9bb0] text-[14px] leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="text-label text-[#4a5a6e] mb-1 flex items-center gap-1.5">
          <CircleHelp size={10} />
          HILFE
        </div>
        <h1 className="text-xl font-semibold text-[#c9d6e3]">
          Dokumentation &amp; Hilfe
        </h1>
      </div>

      {/* Table of Contents */}
      <nav className="mb-10 p-4 bg-[#0b0e11] border border-[#1a2028] rounded-md animate-fade-in">
        <h2 className="text-[13px] font-semibold text-[#4a5a6e] uppercase tracking-wider mb-3">
          Inhalt
        </h2>
        <ul className="space-y-1.5">
          {tocItems.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-[14px] text-[#22d3ee] hover:text-[#67e8f9] transition-colors"
              >
                {i + 1}. {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sections */}
      <div className="animate-fade-in">

        <Section id="about" title="1. Was ist VCG Remote?">
          <p>
            <strong className="text-[#c9d6e3]">VCG Remote</strong> ist ein selbst-gehostetes Web-Dashboard
            zur Verwaltung von tmux-Sessions auf entfernten Servern. Es verbindet sich per SSH mit deinen
            Hosts und bietet ein vollwertiges Terminal direkt im Browser.
          </p>
          <p>
            Das Dashboard funktioniert mit jedem Tool, das in tmux laeuft — ob Claude Code, Codex,
            oder eigene Skripte. Es ist speziell fuer Remote-Entwicklung konzipiert.
          </p>
          <p>
            Der Zugriff wird ueber <strong className="text-[#c9d6e3]">Tailscale</strong> abgesichert.
            Es gibt keine Login-Seite — deine Identitaet wird automatisch ueber das Tailscale-Netzwerk
            erkannt.
          </p>
        </Section>

        <Section id="ssh" title="2. SSH-Grundlagen">
          <p>
            <strong className="text-[#c9d6e3]">SSH (Secure Shell)</strong> ist ein Protokoll, um sich
            sicher mit entfernten Rechnern zu verbinden. VCG Remote nutzt SSH, um Terminal-Sessions
            auf deinen Hosts zu oeffnen.
          </p>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Authentifizierungs-Methoden</h3>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">Passwort</p>
              <p>
                Die einfachste Methode. Du gibst Benutzername und Passwort ein. Weniger sicher als
                SSH-Keys, aber fuer den Einstieg geeignet.
              </p>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">SSH-Key</p>
              <p>
                Ein kryptographisches Schluesselpaar (privat + oeffentlich). Der private Schluessel
                bleibt bei dir, der oeffentliche wird auf dem Server hinterlegt. Sicherer und bequemer
                als Passwoerter.
              </p>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">SSH-Agent</p>
              <p>
                Ein Hintergrund-Programm, das deine SSH-Keys verwaltet. Du musst das Passwort fuer
                deinen Key nur einmal eingeben, danach uebernimmt der Agent.
              </p>
            </div>
          </div>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">SSH-Key erstellen</h3>
          <p>Einen neuen Ed25519-Key erstellen (empfohlen):</p>
          <CodeBlock>ssh-keygen -t ed25519 -C &quot;deine@email.de&quot;</CodeBlock>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Key auf Server kopieren</h3>
          <p>Den oeffentlichen Schluessel auf den Ziel-Host uebertragen:</p>
          <CodeBlock>ssh-copy-id benutzer@hostname</CodeBlock>
          <p>
            Danach kannst du dich ohne Passwort verbinden: <Code>ssh benutzer@hostname</Code>
          </p>
        </Section>

        <Section id="tmux" title="3. tmux">
          <p>
            <strong className="text-[#c9d6e3]">tmux (Terminal Multiplexer)</strong> ermoeglicht es,
            mehrere Terminal-Sessions in einem einzigen Fenster zu verwalten. Der entscheidende Vorteil:
            Sessions laufen im Hintergrund weiter, auch wenn du die Verbindung trennst.
          </p>
          <p>
            VCG Remote braucht tmux auf deinen Hosts, um Sessions zu erstellen, aufzulisten und
            sich mit ihnen zu verbinden.
          </p>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Installation</h3>
          <CodeBlock>{`# Debian / Ubuntu
sudo apt install tmux

# macOS
brew install tmux

# Alpine Linux
apk add tmux`}</CodeBlock>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Wichtige Befehle</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[#1a2028]">
                  <th className="text-left py-2 pr-4 text-[#4a5a6e] font-medium">Befehl</th>
                  <th className="text-left py-2 text-[#4a5a6e] font-medium">Beschreibung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                <tr><td className="py-2 pr-4"><Code>tmux new -s name</Code></td><td className="py-2">Neue Session erstellen</td></tr>
                <tr><td className="py-2 pr-4"><Code>tmux ls</Code></td><td className="py-2">Alle Sessions auflisten</td></tr>
                <tr><td className="py-2 pr-4"><Code>tmux attach -t name</Code></td><td className="py-2">An Session anhaengen</td></tr>
                <tr><td className="py-2 pr-4"><Code>tmux kill-session -t name</Code></td><td className="py-2">Session beenden</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Tastenkuerzel (Prefix: Ctrl+B)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[#1a2028]">
                  <th className="text-left py-2 pr-4 text-[#4a5a6e] font-medium">Kuerzel</th>
                  <th className="text-left py-2 text-[#4a5a6e] font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2028]">
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, D</Code></td><td className="py-2">Session verlassen (detach)</td></tr>
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, C</Code></td><td className="py-2">Neues Fenster</td></tr>
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, N</Code></td><td className="py-2">Naechstes Fenster</td></tr>
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, P</Code></td><td className="py-2">Vorheriges Fenster</td></tr>
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, %</Code></td><td className="py-2">Vertikal teilen</td></tr>
                <tr><td className="py-2 pr-4"><Code>Ctrl+B, &quot;</Code></td><td className="py-2">Horizontal teilen</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="tailscale" title="4. Tailscale">
          <p>
            <strong className="text-[#c9d6e3]">Tailscale</strong> ist ein VPN-Dienst, der ein
            privates Netzwerk (Tailnet) zwischen deinen Geraeten aufbaut. Alle Geraete im Tailnet
            koennen sich gegenseitig erreichen — egal wo sie sich befinden.
          </p>
          <p>
            VCG Remote nutzt Tailscale fuer zwei Dinge: <strong className="text-[#c9d6e3]">Authentifizierung</strong> (wer
            bist du?) und <strong className="text-[#c9d6e3]">Netzwerk-Zugriff</strong> (nur Geraete
            in deinem Tailnet koennen das Dashboard erreichen).
          </p>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Installation</h3>
          <p>
            Lade Tailscale herunter:{' '}
            <a
              href="https://tailscale.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22d3ee] hover:text-[#67e8f9] underline"
            >
              tailscale.com/download
            </a>
          </p>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Verbinden</h3>
          <CodeBlock>tailscale up</CodeBlock>
          <p>
            Nach dem ersten Start wirst du zur Anmeldung weitergeleitet. Danach ist dein Geraet
            Teil deines Tailnets.
          </p>

          <h3 className="text-[15px] font-semibold text-[#c9d6e3] mt-6 mb-2">Auth-Keys fuer Container</h3>
          <p>
            Fuer Server oder Container ohne Browser kannst du einen Auth-Key erstellen
            (in der Tailscale Admin-Konsole unter <em>Settings &rarr; Keys</em>):
          </p>
          <CodeBlock>tailscale up --auth-key=tskey-auth-xxxxx</CodeBlock>
        </Section>

        <Section id="host-setup" title="5. Host einrichten">
          <p>So fuegest du einen neuen Host hinzu:</p>

          <ol className="list-decimal list-inside space-y-3 ml-1">
            <li>
              Gehe zu <strong className="text-[#c9d6e3]">Settings</strong> in der Navigation
            </li>
            <li>
              Klicke auf <strong className="text-[#c9d6e3]">Host hinzufuegen</strong>
            </li>
            <li>
              Gib einen <strong className="text-[#c9d6e3]">Namen</strong> ein (z.B. &quot;Work Laptop&quot;)
            </li>
            <li>
              Trage <strong className="text-[#c9d6e3]">Hostname oder IP</strong> ein
              (z.B. <Code>100.95.255.18</Code> fuer Tailscale-IPs)
            </li>
            <li>
              Gib den <strong className="text-[#c9d6e3]">SSH-Benutzernamen</strong> ein
            </li>
            <li>
              Waehle die <strong className="text-[#c9d6e3]">Authentifizierungs-Methode</strong>:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong className="text-[#c9d6e3]">SSH-Key</strong> — Name der Umgebungsvariable, die den privaten Schluessel enthaelt</li>
                <li><strong className="text-[#c9d6e3]">Passwort</strong> — SSH-Passwort direkt eingeben</li>
              </ul>
            </li>
            <li>
              Klicke auf <strong className="text-[#c9d6e3]">Verbindung testen</strong>, um zu pruefen ob alles funktioniert
            </li>
            <li>
              Speichere den Host
            </li>
          </ol>

          <p className="mt-4">
            Nach dem Hinzufuegen erscheint der Host im Dashboard und du kannst tmux-Sessions
            oeffnen oder bestehende Sessions verbinden.
          </p>
        </Section>

        <Section id="troubleshooting" title="6. Troubleshooting / FAQ">
          <div className="space-y-6">
            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">Verbindung zum Host schlaegt fehl</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Pruefe ob der Host erreichbar ist: <Code>ping hostname</Code></li>
                <li>Teste SSH manuell: <Code>ssh benutzer@hostname</Code></li>
                <li>Stelle sicher, dass der SSH-Dienst laeuft: <Code>systemctl status sshd</Code></li>
                <li>Pruefe die Firewall-Einstellungen (Port 22 offen?)</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">SSH-Key wird nicht akzeptiert</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Pruefe die Berechtigungen: <Code>chmod 600 ~/.ssh/id_ed25519</Code></li>
                <li>Stelle sicher, dass der oeffentliche Schluessel auf dem Server liegt: <Code>cat ~/.ssh/authorized_keys</Code></li>
                <li>Pruefe ob die Umgebungsvariable korrekt gesetzt ist</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">tmux nicht gefunden</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Installiere tmux auf dem Ziel-Host (siehe Abschnitt tmux oben)</li>
                <li>Pruefe die Installation: <Code>which tmux</Code></li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">Terminal zeigt keine Ausgabe / ist schwarz</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Warte kurz — die erste Verbindung kann einige Sekunden dauern</li>
                <li>Pruefe die Browser-Konsole auf WebSocket-Fehler</li>
                <li>Versuche, die Seite neu zu laden</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">Dashboard nicht erreichbar</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Stelle sicher, dass Tailscale aktiv ist: <Code>tailscale status</Code></li>
                <li>Pruefe ob dein Geraet im gleichen Tailnet ist</li>
                <li>Versuche die Tailscale-IP direkt im Browser</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-[#c9d6e3] mb-1">Passwort-Authentifizierung funktioniert nicht</p>
              <ul className="list-disc list-inside ml-1 space-y-1">
                <li>Pruefe ob Passwort-Auth auf dem Server aktiviert ist: <Code>PasswordAuthentication yes</Code> in <Code>/etc/ssh/sshd_config</Code></li>
                <li>Starte den SSH-Dienst nach Aenderungen neu: <Code>systemctl restart sshd</Code></li>
              </ul>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
