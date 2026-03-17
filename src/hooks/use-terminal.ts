'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_FONT_FAMILY = "'MesloLGS NF', 'JetBrains Mono', 'Fira Code', monospace";

const DEFAULT_THEME = {
  background: '#030404',
  foreground: '#c8d6e5',
  cursor: '#fbbf24',
  cursorAccent: '#030404',
  black: '#060809',
  red: '#f87171',
  green: '#34d399',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#a78bfa',
  cyan: '#22d3ee',
  white: '#c8d6e5',
  brightBlack: '#4a5a6e',
  brightRed: '#fca5a5',
  brightGreen: '#6ee7b7',
  brightYellow: '#fde68a',
  brightBlue: '#93c5fd',
  brightMagenta: '#c4b5fd',
  brightCyan: '#67e8f9',
  brightWhite: '#f1f5f9',
};

export interface TerminalOptions {
  fontSize?: number;
  fontFamily?: string;
  theme?: {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent?: string;
    black?: string;
    red?: string;
    green?: string;
    yellow?: string;
    blue?: string;
    magenta?: string;
    cyan?: string;
    white?: string;
  };
}

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: TerminalOptions = {}
) {
  const terminalRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize terminal once
  useEffect(() => {
    if (!containerRef.current) return;

    let terminal: import('@xterm/xterm').Terminal;
    let fitAddon: import('@xterm/addon-fit').FitAddon;

    const init = async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);

      terminal = new Terminal({
        cursorBlink: true,
        fontSize: options.fontSize ?? 14,
        fontFamily: options.fontFamily ?? DEFAULT_FONT_FAMILY,
        theme: (options.theme ?? DEFAULT_THEME) as import('@xterm/xterm').ITheme,
        allowProposedApi: true,
        scrollback: 5000,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      // macOS: Option+Key erzeugt Sonderzeichen (@ € etc.) via
      // "third level shift". xterm.js erwartet dafuer das keypress-Event,
      // das von modernen Browsern nicht mehr zuverlaessig gefeuert wird.
      // Workaround: Zeichen direkt aus event.key einspeisen und alle
      // Folge-Events (keypress, keyup) ebenfalls blockieren.
      const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

      // Clipboard-Helper: Text in die Zwischenablage schreiben.
      // navigator.clipboard (Secure Context) mit Fallback.
      const writeClipboard = (text: string) => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
          fallbackCopy(text);
        }
      };

      const fallbackCopy = (text: string) => {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.style.position = 'fixed';
        tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      };

      // OSC 52 Clipboard-Integration: tmux/vim senden Clipboard-Inhalt
      // als ESC]52;TARGETS;BASE64_TEXT ST. Wir dekodieren und schreiben
      // in navigator.clipboard. Das ist der korrekte Weg fuer
      // tmux-over-SSH wenn tmux Mouse-Mode aktiv ist.
      terminal.parser.registerOscHandler(52, (data: string) => {
        const idx = data.indexOf(';');
        if (idx === -1) return true;

        const payload = data.slice(idx + 1);

        // Query: "?" = Clipboard-Inhalt an tmux/vim zuruecksenden
        if (payload === '?') {
          navigator.clipboard?.readText?.().then((text) => {
            const bytes = new TextEncoder().encode(text);
            const b64 = btoa(String.fromCharCode(...bytes));
            terminal.input(`\x1b]52;c;${b64}\x07`);
          }).catch(() => {});
          return true;
        }

        // Set: base64-dekodierten Text in die Zwischenablage schreiben
        try {
          const raw = atob(payload);
          const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
          const text = new TextDecoder().decode(bytes);
          writeClipboard(text);
        } catch {
          // ungueltige base64-Daten ignorieren
        }
        return true;
      });

      // Keyboard-Handler:
      // - Cmd+C (macOS) / Ctrl+Shift+C: xterm-Selektion kopieren
      // - Cmd+V (macOS) / Ctrl+Shift+V: aus Zwischenablage einfuegen
      // - macOS Option+Key: Sonderzeichen (@ € ~ etc.)
      // CSI u Modifier-Mapping: Modifier → CSI u Parameter
      // 1=none, 2=Shift, 3=Alt, 4=Shift+Alt, 5=Ctrl, 6=Ctrl+Shift, 7=Ctrl+Alt, 8=Ctrl+Shift+Alt
      const csiuModifier = (ev: KeyboardEvent): number => {
        let mod = 1;
        if (ev.shiftKey) mod += 1;
        if (ev.altKey) mod += 2;
        if (ev.ctrlKey) mod += 4;
        return mod;
      };

      // Tasten die via CSI u (fixterm/kitty) gesendet werden muessen,
      // weil xterm.js sie nicht vom unmodifizierten Pendant unterscheidet.
      // Format: keycode → { key match, unmodified sequence (optional) }
      const CSIU_KEYS: Record<string, { match: (ev: KeyboardEvent) => boolean }> = {
        '13': { match: (ev) => ev.key === 'Enter' },
        '9':  { match: (ev) => ev.key === 'Tab' },
        '27': { match: (ev) => ev.key === 'Escape' },
      };

      terminal.attachCustomKeyEventHandler((ev: KeyboardEvent) => {
        // CSI u: modifizierte Spezialtasten als \x1b[CODE;MODu senden.
        // queueMicrotask: input() muss NACH dem return false laufen,
        // sonst schluckt xterm.js 6.x den onData-Event.
        if (ev.type === 'keydown') {
          const mod = csiuModifier(ev);
          if (mod > 1) {
            for (const [code, { match }] of Object.entries(CSIU_KEYS)) {
              if (match(ev)) {
                ev.preventDefault();
                const seq = `\x1b[${code};${mod}u`;
                queueMicrotask(() => terminal.input(seq));
                return false;
              }
            }
          }
        }

        if (ev.type === 'keydown' && terminal.hasSelection()) {
          const isCopy = isMac
            ? (ev.metaKey && ev.key === 'c')
            : (ev.ctrlKey && ev.shiftKey && ev.key === 'C');
          if (isCopy) {
            ev.preventDefault();
            writeClipboard(terminal.getSelection());
            return false;
          }
        }

        if (ev.type === 'keydown') {
          const isPaste = isMac
            ? (ev.metaKey && ev.key === 'v')
            : (ev.ctrlKey && ev.shiftKey && ev.key === 'V');
          if (isPaste) {
            ev.preventDefault();
            navigator.clipboard?.readText?.().then((text) => {
              if (text) terminal.input(text);
            }).catch(() => {});
            return false;
          }
        }

        if (
          isMac &&
          ev.type === 'keydown' &&
          ev.altKey &&
          !ev.ctrlKey &&
          !ev.metaKey &&
          ev.key.length === 1
        ) {
          ev.preventDefault();
          terminal.input(ev.key);
          return false;
        }

        return true;
      });

      if (containerRef.current) {
        terminal.open(containerRef.current);

        // Auto-Copy bei mouseup: Selektion direkt in die
        // Zwischenablage schreiben (navigator.clipboard + Fallback).
        const xtermEl = terminal.element;
        if (xtermEl) {
          xtermEl.addEventListener('mouseup', () => {
            if (terminal.hasSelection()) {
              writeClipboard(terminal.getSelection());
            }
          });
        }

        // Mobile: Wenn ein Tastatur-Vorschlag angenommen wird, feuert
        // der Browser "insertReplacementText". xterm.js kennt diesen
        // inputType nicht und verarbeitet ihn parallel ueber Composition-
        // UND Input-Handler — Race-Condition fuehrt zu Text-Verdopplung.
        // Fix: Default verhindern, nur das Delta (neue Zeichen) senden.
        const ta = terminal.textarea;
        if (ta) {
          ta.addEventListener('beforeinput', (e: InputEvent) => {
            if (e.inputType === 'insertReplacementText') {
              e.preventDefault();

              const replacement = e.data
                ?? (e as unknown as { dataTransfer?: DataTransfer })
                    .dataTransfer?.getData('text/plain')
                ?? '';
              if (!replacement) return;

              const current = ta.value;
              if (replacement.startsWith(current)) {
                // Haeufigster Fall: Vorschlag erweitert getippten Text
                // z.B. "hel" → "hello" — nur "lo" senden
                const delta = replacement.slice(current.length);
                if (delta) terminal.input(delta);
              } else {
                // Autocorrect-Fall: anderes Wort — bestehenden Text
                // per DEL loeschen, dann Replacement senden
                terminal.input('\x7f'.repeat(current.length) + replacement);
              }
            }
          });
        }

        // Delay first fit to ensure browser layout is complete
        requestAnimationFrame(() => {
          try { fitAddon.fit(); } catch { /* ignore if disposed */ }
        });
      }

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setReady(true);

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch {
          // ignore if terminal is being disposed
        }
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    };

    const cleanup = init();

    return () => {
      cleanup.then((fn) => fn?.());
      terminal?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      setReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch-Scrolling: tmux verwaltet den Scrollback, nicht xterm.js.
  // Daher uebersetzen wir Touch-Gesten in synthetische WheelEvents,
  // die xterm.js in Mouse-Escape-Sequenzen konvertiert (bei mouse on)
  // oder fuer lokales Scrolling nutzt (bei mouse off).
  useEffect(() => {
    const term = terminalRef.current;
    if (!term || !ready) return;

    const el = containerRef.current;
    if (!el) return;

    // Ziel fuer WheelEvent-Dispatch: xterm-screen (wo xterm Wheel-Handler lauscht)
    const wheelTarget = term.element?.querySelector('.xterm-screen') ?? term.element ?? el;

    let touchStartY = 0;
    let accumulated = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      // Nur Touches innerhalb des Terminal-Containers tracken
      const target = e.target as Node | null;
      if (!target || !el.contains(target)) {
        tracking = false;
        return;
      }
      tracking = true;
      touchStartY = e.touches[0].clientY;
      accumulated = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || !e.touches[0]) return;
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      touchStartY = currentY;
      accumulated += deltaY;

      // Zeilenhoehe aus xterm.js Render-Dimensionen
      const cellHeight = (term as unknown as {
        _core?: { _renderService?: { dimensions?: { css?: { cell?: { height?: number } } } } }
      })._core?._renderService?.dimensions?.css?.cell?.height ?? 18;

      const lines = Math.trunc(accumulated / cellHeight);
      if (lines !== 0) {
        accumulated -= lines * cellHeight;

        // Synthetisches WheelEvent pro Zeile dispatchen —
        // xterm.js konvertiert das in Mouse-Escape-Sequenzen
        // fuer tmux (bei mouse on) oder scrollt lokal (bei mouse off)
        const rect = wheelTarget.getBoundingClientRect();
        const cx = Math.round(rect.left + rect.width / 2);
        const cy = Math.round(rect.top + rect.height / 2);

        for (let i = 0; i < Math.abs(lines); i++) {
          const wheel = new WheelEvent('wheel', {
            deltaY: lines > 0 ? cellHeight : -cellHeight,
            deltaX: 0,
            deltaMode: 0, // DOM_DELTA_PIXEL
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true,
          });
          wheelTarget.dispatchEvent(wheel);
        }
      }

      // Pull-to-Refresh und Browser-Scroll verhindern
      e.preventDefault();
    };

    // Capture-Phase auf document — garantiert dass wir vor allem feuern
    document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });

    return () => {
      document.removeEventListener('touchstart', onTouchStart, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', onTouchMove, { capture: true } as EventListenerOptions);
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update font size / family without re-creating the terminal
  useEffect(() => {
    const term = terminalRef.current;
    const fit = fitAddonRef.current;
    if (!term || !ready) return;

    const newSize = options.fontSize ?? 14;
    const newFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;

    if (term.options.fontSize !== newSize) {
      term.options.fontSize = newSize;
    }
    if (term.options.fontFamily !== newFamily) {
      term.options.fontFamily = newFamily;
    }

    try { fit?.fit(); } catch { /* ignore */ }
  }, [options.fontSize, options.fontFamily, ready]);

  return {
    terminal: terminalRef.current,
    fitAddon: fitAddonRef.current,
    ready,
  };
}
