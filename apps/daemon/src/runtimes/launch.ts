import { accessSync, constants, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path, { delimiter } from 'node:path';
import { inspectAgentExecutableResolution } from './executables.js';
import type { RuntimeAgentDef } from './types.js';

export type AgentLaunchKind = 'selected' | 'codex-native';

export type AgentLaunchResolution = ReturnType<typeof inspectAgentExecutableResolution> & {
  launchPath: string | null;
  launchKind: AgentLaunchKind;
  childPathPrepend: string[];
  diagnostic: string | null;
};

export function resolveAgentLaunch(
  def: RuntimeAgentDef,
  configuredEnv: Record<string, string> = {},
): AgentLaunchResolution {
  const resolution = inspectAgentExecutableResolution(def, configuredEnv);
  if (!resolution.selectedPath) {
    return { ...resolution, launchPath: null, launchKind: 'selected', childPathPrepend: [], diagnostic: null };
  }
  const childPathPrepend = path.isAbsolute(resolution.selectedPath)
    ? [path.dirname(resolution.selectedPath)]
    : [];
  if (def.id !== 'codex') {
    return { ...resolution, launchPath: resolution.selectedPath, launchKind: 'selected', childPathPrepend, diagnostic: null };
  }
  const native = tryResolveCodexNativeBinary(resolution.selectedPath);
  return {
    ...resolution,
    launchPath: native.path ?? resolution.selectedPath,
    launchKind: native.path ? 'codex-native' : 'selected',
    childPathPrepend,
    diagnostic: native.diagnostic,
  };
}

export function applyAgentLaunchEnv(
  env: NodeJS.ProcessEnv,
  launch: Pick<AgentLaunchResolution, 'childPathPrepend'>,
): NodeJS.ProcessEnv {
  if (launch.childPathPrepend.length === 0) return env;
  const existing = typeof env.PATH === 'string' ? env.PATH : '';
  const PATH = [...launch.childPathPrepend, ...existing.split(delimiter)]
    .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index)
    .join(delimiter);
  return { ...env, PATH };
}

function tryResolveCodexNativeBinary(wrapperPath: string): { path: string | null; diagnostic: string | null } {
  const target = codexNativeTarget();
  for (const root of codexSearchRoots(wrapperPath)) {
    for (const candidate of codexNativeCandidates(root, target)) {
      if (isExecutableFile(candidate)) return { path: candidate, diagnostic: null };
    }
  }
  if (!looksLikeCodexNodeWrapper(wrapperPath)) return { path: null, diagnostic: null };
  return {
    path: null,
    diagnostic: `Codex native binary was not found for ${target}; falling back to wrapper ${wrapperPath}. Set CODEX_BIN to a native Codex binary if this wrapper cannot launch from a GUI environment.`,
  };
}

function codexSearchRoots(wrapperPath: string): string[] {
  const roots = new Set<string>();
  for (const seed of [wrapperPath, safeRealpath(wrapperPath)]) {
    if (!seed) continue;
    let current = path.dirname(seed);
    while (current !== path.dirname(current)) {
      roots.add(current);
      current = path.dirname(current);
    }
  }
  return [...roots];
}

function codexNativeCandidates(root: string, target: string): string[] {
  const scoped = path.join(root, 'node_modules', '@openai');
  const packageDirs = [path.join(scoped, `codex-${target}`)];
  try {
    for (const entry of readdirSync(scoped, { encoding: 'utf8', withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('codex-')) packageDirs.push(path.join(scoped, entry.name));
    }
  } catch {
    // Optional package layouts vary by npm version; absence uses wrapper fallback.
  }
  return [...new Set(packageDirs)].flatMap((dir) => [
    path.join(dir, 'codex'),
    path.join(dir, 'bin', 'codex'),
    path.join(dir, 'vendor', 'codex'),
    path.join(dir, 'codex.exe'),
    path.join(dir, 'bin', 'codex.exe'),
  ]);
}

function codexNativeTarget(): string {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const arch = process.arch === 'x64' || process.arch === 'arm64' ? process.arch : process.arch;
  return `${platform}-${arch}`;
}

function looksLikeCodexNodeWrapper(filePath: string): boolean {
  try {
    const body = readFileSync(filePath, { encoding: 'utf8' }).slice(0, 64_000);
    return /node|@openai\/codex|codex-/i.test(body);
  } catch {
    return false;
  }
}

function safeRealpath(filePath: string): string | null {
  try {
    return realpathSync(filePath);
  } catch {
    return null;
  }
}

function isExecutableFile(filePath: string): boolean {
  try {
    if (!statSync(filePath).isFile()) return false;
    if (process.platform !== 'win32') accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
