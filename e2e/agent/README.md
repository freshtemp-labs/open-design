# `e2e/agent/` — PR Explore Agent

Operator runbook for the per-PR advisory exploratory agent. Spec:
[`specs/change/20260522-pr-explore-agent/spec.md`](../../specs/change/20260522-pr-explore-agent/spec.md).

## What lives here

- `extract-verdicts.ts` — wrapper that renders the agent session
  output into the structured PR comment markdown. Strict parser; bad
  output surfaces as `status: unknown` in the comment with the raw
  text preserved.
- (The system prompt that drives the agent lives in the workflow body
  at `.github/workflows/agent-pr-explore.md` — it is the second half
  of the gh-aw markdown file, below the frontmatter.)

## How a run happens

1. A PR touches `apps/web/**` or `apps/landing-page/**`.
2. The workflow enters `pending_deployment_review` immediately.
3. A reviewer in the `agent-pr-explore` GitHub environment's required
   reviewers list clicks **Approve and deploy** on the PR's Checks tab.
4. The runner checks out the PR head, picks the right boot command
   (web → `pnpm tools-dev run web`; landing-page → `pnpm --filter
   @open-design/landing-page dev`), waits for `$OD_BASE_URL` to serve
   HTTP 200.
5. Claude Sonnet runs with `playwright-cli` available and explores
   the PR's claims. Output is per-line `STEP_START` / `STEP_DONE`
   markers (see spec § Wire format).
6. `extract-verdicts.ts` reads the session output, renders the
   structured comment, posts via `safe-outputs.add-comment`.
7. `gh-aw` threat-detection scans the agent output before the comment
   is allowed to post. If detection blocks it, the run fails — the
   failure surfaces via the GitHub Actions UI and (eventually) an
   out-of-band maintainer notification, never via the PR comment.

## Repo-settings prerequisites

| Setting | Where | Value |
|---|---|---|
| Environment `agent-pr-explore` | Settings → Environments → New | with required reviewers list |
| Required reviewers (P1) | the environment's reviewers list | `@lefarcen` only |
| Required reviewers (P2+) | the environment's reviewers list | `@lefarcen`, `@mrcfps`, `@nettee`, `@Siri-Ray`, `@PerishCode`, `@qiongyu1999` |
| Secret `ANTHROPIC_API_KEY` | Settings → Secrets and variables → Actions | from the org's Anthropic account |

## Local dev — how to verify a change to the workflow or wrapper

The agent itself can't be run locally without the full gh-aw sandbox,
but the wrapper can:

```bash
# Run the wrapper against a recorded session jsonl from a prior spike
node --experimental-strip-types e2e/agent/extract-verdicts.ts \
  --input <path-to-agent-output.json> \
  --pr 2604 \
  --head deadbeef12345678 \
  --approver lefarcen \
  --output /tmp/agent-comment.md
```

For the gh-aw workflow markdown, edit
`.github/workflows/agent-pr-explore.md` and run:

```bash
gh aw compile
```

If `--exclude-env` config or a new secret is needed, gh-aw's
`safe-update` mode will block the compile until you confirm with
`--approve`. That is the gate for any secret reference change — do
not bypass casually.

## Cost & failure modes

- Per approved run: ≈ $0.10–0.30 (Sonnet API). See spec § Cost.
- Threat-detection block on agent output → run fails, no comment
  posted, artifact still uploaded for forensics.
- `RUN_DONE` marker missing → comment shows verdict as `inconclusive
  (no RUN_DONE marker)`; reviewer can request a rerun by pushing a new
  commit (same SHA does NOT requeue approval).
- Unpaired `STEP_START`/`STEP_DONE` → that step rendered as
  `status: unknown` with the explicit "verdict parsing failed for
  step-NN" line; reviewer follows the artifact link.

## Future work

- The follow-on **Sedimentation Bot** spec turns `SEDIMENT|...` lines
  from PR comments into proposed `e2e/` and visual-regression PRs.
  Until that lands, sediment candidates surface in the PR comment as
  read-only suggestions.
- P4 (separate spec): self-driven Playwright driver to replace the
  `expect-cli` upstream dependency, enable persistent screenshots +
  trace recording, and add the CLI-exploratory-agent that covers the
  `od` half of the dual-track invariant.
