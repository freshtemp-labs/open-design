// Hand-off menu in the ChatPane header. The menu keeps the original
// "open the design project folder in <local app>" path, and adds a
// code-agent handoff path that copies a framework-specific prompt with
// the resolved project folder embedded.

import { useEffect, useRef, useState } from 'react';
import type {
  HostEditor,
  HostEditorId,
  HostEditorsResponse,
} from '@open-design/contracts';
import { fetchHostEditors, openProjectInEditor } from '../providers/registry';
import {
  buildCodeAgentHandoffPrompt,
  codeAgentHandoffTargetLabel,
  type CodeAgentHandoffTarget,
} from '../lib/build-code-agent-handoff-prompt';
import { copyToClipboard } from '../lib/copy-to-clipboard';
import { useT } from '../i18n';
import { Icon } from './Icon';
import { EditorIcon } from './EditorIcon';

const PREFERRED_EDITOR_KEY = 'open-design:preferred-editor';
const CODE_AGENT_TARGETS: CodeAgentHandoffTarget[] = ['react', 'vue', 'svelte', 'solid'];

interface Props {
  projectId: string;
  projectName?: string;
  projectDir?: string | null;
  // Optional fallback "always open in OS file manager" - falls back to the
  // existing shell.openPath bridge in case the daemon catalogue is empty
  // (highly unlikely on macOS / Win / Linux but harmless to support).
  onRequestRevealInFinder?: () => void;
}

function readPreferred(): HostEditorId | null {
  try {
    const v = window.localStorage.getItem(PREFERRED_EDITOR_KEY);
    return (v as HostEditorId) || null;
  } catch {
    return null;
  }
}

function writePreferred(id: HostEditorId): void {
  try {
    window.localStorage.setItem(PREFERRED_EDITOR_KEY, id);
  } catch {
    // ignore - quota or sandboxed
  }
}

function FrameworkIcon({ target }: { target: CodeAgentHandoffTarget }) {
  if (target === 'react') {
    return (
      <svg
        className="handoff-framework-icon handoff-framework-icon-react"
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-testid="handoff-framework-icon-react"
      >
        <ellipse cx="12" cy="12" rx="9.2" ry="3.8" />
        <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(120 12 12)" />
        <circle cx="12" cy="12" r="1.9" />
      </svg>
    );
  }
  if (target === 'vue') {
    return (
      <svg
        className="handoff-framework-icon handoff-framework-icon-vue"
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-testid="handoff-framework-icon-vue"
      >
        <path className="vue-outer" d="M2.2 4.2h4.5L12 13.2l5.3-9h4.5L12 21 2.2 4.2z" />
        <path className="vue-inner" d="M6.7 4.2h4.1L12 6.4l1.2-2.2h4.1L12 13.2 6.7 4.2z" />
      </svg>
    );
  }
  if (target === 'svelte') {
    return (
      <svg
        className="handoff-framework-icon handoff-framework-icon-svelte"
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-testid="handoff-framework-icon-svelte"
      >
        <path d="M16.8 2.9a6.2 6.2 0 0 0-6.4.3L6.2 5.9a5.5 5.5 0 0 0-2.1 6.7 5.4 5.4 0 0 0 .9 7.5 6.2 6.2 0 0 0 6.4-.3l4.2-2.7a5.5 5.5 0 0 0 2.1-6.7 5.4 5.4 0 0 0-.9-7.5z" />
        <path d="M7.8 17.2a2.7 2.7 0 0 0 2.8.1l4.1-2.6a1.8 1.8 0 0 0 .8-2.2 1.8 1.8 0 0 0-2.7-.8l-1.6 1a1.6 1.6 0 0 1-2.3-.6 1.7 1.7 0 0 1 .6-2.3l4.1-2.6a2.7 2.7 0 0 1 2.7-.1" />
      </svg>
    );
  }
  return (
    <svg
      className="handoff-framework-icon handoff-framework-icon-solid"
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-testid="handoff-framework-icon-solid"
    >
      <path className="solid-back" d="M6.9 4.1 19 7.6l-4.7 3.1L2.2 7.2 6.9 4.1z" />
      <path className="solid-mid" d="M14.3 10.7 19 7.6l2.8 5.2-4.7 3.1-2.8-5.2z" />
      <path className="solid-front" d="M5 11.2 17.1 15l-4 4.9L1 16.1l4-4.9z" />
      <path className="solid-edge" d="m17.1 15 4.7-3.1-4 4.9-4.7 3.1 4-4.9z" />
    </svg>
  );
}

export function HandoffButton({
  projectId,
  projectName = projectId,
  projectDir,
  onRequestRevealInFinder,
}: Props) {
  const t = useT();
  const [editors, setEditors] = useState<HostEditor[]>([]);
  const [platform, setPlatform] = useState<HostEditorsResponse['platform']>('unknown');
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'open-folder' | 'code-agent'>('open-folder');
  const [busy, setBusy] = useState<HostEditorId | null>(null);
  const [copyBusy, setCopyBusy] = useState<CodeAgentHandoffTarget | null>(null);
  const [copyStatus, setCopyStatus] = useState<{
    target: CodeAgentHandoffTarget | null;
    state: 'copied' | 'failed';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHostEditors()
      .then((resp) => {
        if (cancelled) return;
        setEditors(resp.editors);
        setPlatform(resp.platform);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEditors([]);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (copyStatusTimerRef.current) clearTimeout(copyStatusTimerRef.current);
  }, []);

  const available = editors.filter((e) => e.available);
  const unavailable = editors.filter((e) => !e.available);
  const preferred = readPreferred();
  const primary =
    available.find((e) => e.id === preferred) ?? available[0] ?? null;
  const fallbackLabel = platform === 'win32' ? 'Explorer' : platform === 'linux' ? 'File Manager' : 'Finder';
  const fallbackId: HostEditorId =
    platform === 'win32' ? 'explorer' : platform === 'linux' ? 'file-manager' : 'finder';

  async function launch(editor: HostEditor) {
    if (!editor.available) {
      // Still try - the user might have an unprobed path (e.g. macOS
      // bundle in /Applications). The daemon will return 409 if it
      // genuinely can't find it.
    }
    setError(null);
    setBusy(editor.id);
    setOpen(false);
    writePreferred(editor.id);
    try {
      await openProjectInEditor(projectId, editor.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Fallback: if Finder is the user's pick and the daemon spawn
      // failed, try the renderer-side reveal-in-finder bridge.
      if (editor.id === 'finder' && onRequestRevealInFinder) {
        try {
          onRequestRevealInFinder();
        } catch {
          // ignore
        }
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyAgentPrompt(target: CodeAgentHandoffTarget) {
    if (copyStatusTimerRef.current) {
      clearTimeout(copyStatusTimerRef.current);
      copyStatusTimerRef.current = null;
    }
    setCopyStatus(null);
    if (!projectDir) {
      setCopyStatus({ target, state: 'failed' });
      return;
    }
    setCopyBusy(target);
    const prompt = buildCodeAgentHandoffPrompt({
      project: { id: projectId, name: projectName },
      projectDir,
      target,
    });
    const copied = await copyToClipboard(prompt);
    setCopyBusy(null);
    setCopyStatus({ target, state: copied ? 'copied' : 'failed' });
    if (copied) {
      copyStatusTimerRef.current = setTimeout(() => {
        setCopyStatus(null);
        copyStatusTimerRef.current = null;
      }, 2200);
    }
  }

  if (!loaded) {
    return null;
  }

  return (
    <div
      className={`handoff-wrap${open ? ' open' : ''}`}
      ref={wrapRef}
      data-testid="handoff-wrap"
    >
      {/* Split control: both the labeled left side and caret open the
          handoff picker so open-folder and code-agent paths stay equally
          discoverable. */}
      <div className="handoff-split">
        <button
          type="button"
          className="handoff-trigger"
          data-testid="handoff-trigger"
          title={t('handoff.action')}
          onClick={() => setOpen((v) => !v)}
          disabled={busy !== null}
        >
          {primary ? (
            <>
              <EditorIcon editorId={primary.id} size={20} />
              <span className="handoff-trigger-label">
                {t('handoff.action')}
              </span>
            </>
          ) : (
            <>
              <EditorIcon editorId={fallbackId} size={20} />
              <span className="handoff-trigger-label">{t('handoff.action')}</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="handoff-caret"
          aria-label={t('handoff.chooseTargetAria')}
          data-testid="handoff-caret"
          onClick={() => setOpen((v) => !v)}
          disabled={busy !== null}
        >
          <Icon name="chevron-down" size={14} />
        </button>
      </div>
      {open ? (
        <div className="handoff-menu" role="menu" data-testid="handoff-menu">
          <div className="handoff-tabs" role="tablist" aria-label="Hand-off mode">
            <button
              type="button"
              className={`handoff-tab${activeTab === 'open-folder' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'open-folder'}
              onClick={() => setActiveTab('open-folder')}
            >
              打开文件夹
            </button>
            <button
              type="button"
              className={`handoff-tab${activeTab === 'code-agent' ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'code-agent'}
              onClick={() => setActiveTab('code-agent')}
            >
              Code agent
            </button>
          </div>
          {activeTab === 'open-folder' ? (
            <div className="handoff-panel" role="tabpanel">
              {available.length > 0 ? available.map((editor) => (
                <button
                  key={editor.id}
                  type="button"
                  className={`handoff-menu-item${editor.id === preferred ? ' active' : ''}`}
                  role="menuitem"
                  data-testid={`handoff-menu-item-${editor.id}`}
                  onClick={() => void launch(editor)}
                  disabled={busy === editor.id}
                >
                  <EditorIcon editorId={editor.id} size={20} />
                  <span>{editor.label}</span>
                  {editor.id === preferred ? (
                    <Icon name="check" size={12} />
                  ) : null}
                </button>
              )) : (
                <button
                  type="button"
                  className="handoff-menu-item"
                  role="menuitem"
                  onClick={() => onRequestRevealInFinder?.()}
                  title={t('handoff.fallbackTitle', { target: fallbackLabel })}
                >
                  <EditorIcon editorId={fallbackId} size={20} />
                  <span>{fallbackLabel}</span>
                </button>
              )}
              {unavailable.length > 0 ? (
                <>
                  <div className="handoff-menu-divider" />
                  <div className="handoff-menu-section">{t('handoff.notInstalled')}</div>
                  {unavailable.map((editor) => (
                    <button
                      key={editor.id}
                      type="button"
                      className="handoff-menu-item dim"
                      role="menuitem"
                      data-testid={`handoff-menu-item-${editor.id}`}
                      onClick={() => void launch(editor)}
                      disabled={busy === editor.id}
                      title={t('handoff.notDetectedTitle', { target: editor.label })}
                    >
                      <EditorIcon editorId={editor.id} size={20} />
                      <span>{editor.label}</span>
                    </button>
                  ))}
                </>
              ) : null}
            </div>
          ) : (
            <div className="handoff-panel" role="tabpanel">
              <div className="handoff-menu-section">Copy prompt</div>
              {CODE_AGENT_TARGETS.map((target) => {
                const label = codeAgentHandoffTargetLabel(target);
                const copied = copyStatus?.target === target && copyStatus.state === 'copied';
                return (
                  <button
                    key={target}
                    type="button"
                    className="handoff-menu-item"
                    role="menuitem"
                    data-testid={`handoff-agent-target-${target}`}
                    onClick={() => void copyAgentPrompt(target)}
                    disabled={copyBusy !== null}
                    title={projectDir
                      ? `Copy ${label} handoff prompt`
                      : 'Working directory unavailable'}
                  >
                    <FrameworkIcon target={target} />
                    <span>{label}</span>
                    <small>复制 prompt</small>
                    {copied ? <Icon name="check" size={14} /> : null}
                  </button>
                );
              })}
              {copyStatus ? (
                <div
                  className={`handoff-menu-status ${copyStatus.state}`}
                  role="status"
                  data-testid="handoff-agent-copy-status"
                >
                  {copyStatus.state === 'copied'
                    ? 'Prompt copied. Paste it into Claude Code, Cursor, Codex, or another code agent.'
                    : projectDir
                      ? 'Clipboard unavailable. Copy from a secure browser or desktop window.'
                      : 'Working directory unavailable. Wait for the project folder to finish loading.'}
                </div>
              ) : null}
            </div>
          )}
          {error ? (
            <>
              <div className="handoff-menu-divider" />
              <div className="handoff-menu-error">{error}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
