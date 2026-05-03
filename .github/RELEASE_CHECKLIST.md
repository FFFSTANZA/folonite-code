# Folonite Release Checklist

Use this checklist for stable Folonite desktop releases.

## 1. Prepare

- Confirm the release PR targets `dev` and all required CI checks are green.
- Confirm the version bump is merged into `dev`.
- Confirm `dev` is up to date locally:

```bash
git switch dev
git pull --ff-only
```

- Confirm the release tag does not already exist:

```bash
git fetch origin --tags
git tag -l vX.Y.Z
gh release view vX.Y.Z --repo fffstanza/folonite-code
```

## 2. Draft Release Notes Before Publishing

Create or update the GitHub Release body before publishing the release. Use English first, direct user download links, then a short Chinese section.

```md
## Downloads

- [macOS Apple Silicon](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-mac-arm64.dmg)
- [macOS Intel](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-mac-x64.dmg)
- [Windows](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-win-x64.exe)

## App Update Notice

- Short product-facing sentence for the in-app post-update modal. Do not include download links, PR numbers, verification details, or maintenance-only notes.

## Highlights

- User-facing changes, bug fixes, or packaging fixes.

## Runtime And Maintenance

- Build, updater, notarization, dependency, or CI maintenance.

## Verification

- macOS Apple Silicon submit/finalize completed successfully, including notarization.
- macOS Intel submit/finalize completed successfully, including notarization.
- Windows x64 release build completed successfully.
- vX.Y.Z is published as the latest stable release.

## 中文版本

### 下载

- [macOS Apple 芯片](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-mac-arm64.dmg)
- [macOS Intel 芯片](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-mac-x64.dmg)
- [Windows](https://github.com/fffstanza/folonite-code/releases/download/vX.Y.Z/folonite-win-x64.exe)

### 主要更新

- 用一句话概括主要变化。
```

Do not rely on the GitHub Assets list as the primary download UI. It mixes user installers with updater metadata, so direct links make the intended downloads clear.

## 3. Build Release Artifacts

Submit macOS notarization for both architectures:

```bash
gh workflow run build.yml --repo fffstanza/folonite-code --ref dev -f phase=submit -f channel=prod -f target=macos -f arch=arm64
gh workflow run build.yml --repo fffstanza/folonite-code --ref dev -f phase=submit -f channel=prod -f target=macos -f arch=x64
```

Record each submit run's source run ID, source run attempt, source ref, source sha, workflow ref, workflow sha, and Apple submission ID from the workflow summary.

The submit workflow summary should include values like this:

```text
source_run_id: 123456789
source_run_attempt: 1
source_ref: dev
source_sha: 0123456789abcdef0123456789abcdef01234567
source_workflow_ref: dev
source_workflow_sha: 0123456789abcdef0123456789abcdef01234567
submission_id: 00000000-0000-0000-0000-000000000000
```

Finalize each macOS architecture with the exact command emitted by its submit workflow summary. If writing the commands manually, keep the arm64 and x64 values separate:

For arm64, replace `ARM64_SOURCE_RUN_ID` with the `source_run_id` value from the arm64 submit summary, and apply the same mapping for the other `ARM64_` placeholders. Repeat with the x64 submit summary for the `X64_` placeholders.

```bash
gh workflow run build.yml --repo fffstanza/folonite-code --ref ARM64_SOURCE_WORKFLOW_REF -f phase=finalize -f channel=prod -f arch=arm64 -f source_run_id=ARM64_SOURCE_RUN_ID -f source_run_attempt=ARM64_SOURCE_RUN_ATTEMPT -f source_ref=ARM64_SOURCE_REF -f source_sha=ARM64_SOURCE_SHA -f source_workflow_ref=ARM64_SOURCE_WORKFLOW_REF -f source_workflow_sha=ARM64_SOURCE_WORKFLOW_SHA -f submission_id=ARM64_SUBMISSION_ID
gh workflow run build.yml --repo fffstanza/folonite-code --ref X64_SOURCE_WORKFLOW_REF -f phase=finalize -f channel=prod -f arch=x64 -f source_run_id=X64_SOURCE_RUN_ID -f source_run_attempt=X64_SOURCE_RUN_ATTEMPT -f source_ref=X64_SOURCE_REF -f source_sha=X64_SOURCE_SHA -f source_workflow_ref=X64_SOURCE_WORKFLOW_REF -f source_workflow_sha=X64_SOURCE_WORKFLOW_SHA -f submission_id=X64_SUBMISSION_ID
```

Build and publish the Windows installer:

```bash
gh workflow run build.yml --repo fffstanza/folonite-code --ref dev -f phase=full -f channel=prod -f target=windows -f arch=x64
```

## 4. Publish

Verify the draft release has all expected user-facing installers before publishing:

```bash
gh release view vX.Y.Z --repo fffstanza/folonite-code --json isDraft,isPrerelease,assets,url
```

Publish the release as the latest stable release:

```bash
gh release edit vX.Y.Z --repo fffstanza/folonite-code --draft=false --latest --prerelease=false
```

## 5. Post-Release Verification

Run the verification helper:

```bash
export GH_TOKEN="$(gh auth token)"
bun packages/desktop-electron/scripts/verify-release.ts vX.Y.Z
```

`GH_TOKEN` is recommended so GitHub API requests use the authenticated rate limit.

The helper verifies:

- The GitHub Release is not a draft.
- The GitHub Release is not a prerelease.
- `folonite-mac-arm64.dmg` exists.
- `folonite-mac-x64.dmg` exists.
- `folonite-win-x64.exe` exists.
- updater `.zip` and `.blockmap` assets exist.
- `latest.yml` points to `folonite-win-x64.exe`.
- `latest-mac.yml` includes both `folonite-mac-arm64.zip` and `folonite-mac-x64.zip`.

Also verify a fresh packaged startup before closing startup-blocking issues. The command below is for macOS; override `FOLONITE_RELEASE_APP_PATH` and `FOLONITE_RELEASE_STARTUP_LOG` if the app or log is in a custom location.

```bash
set -euo pipefail
smoke_home=/tmp/folonite-release-smoke/user-data
smoke_user_data="$smoke_home/ai.folonite.desktop"
ready_file="$smoke_user_data/ci-smoke-ready.json"
app_path=${FOLONITE_RELEASE_APP_PATH:-/Applications/Folonite.app/Contents/MacOS/Folonite}
startup_log=${FOLONITE_RELEASE_STARTUP_LOG:-$smoke_user_data/logs/main.log}
app_pid=""
cleanup() {
  if [ -n "$app_pid" ]; then
    kill "$app_pid" 2>/dev/null || true
  fi
  rm -rf "$smoke_home"
}
trap cleanup EXIT
rm -rf "$smoke_home"
FOLONITE_CI_SMOKE=true FOLONITE_CI_SMOKE_HOME="$smoke_home" "$app_path" &
app_pid=$!
i=0
while [ "$i" -lt 60 ]; do
  test -f "$ready_file" && break
  sleep 1
  i=$((i + 1))
done
if [ ! -f "$ready_file" ]; then
  echo "Timed out waiting for $ready_file"
  exit 1
fi
sleep 1
FOLONITE_RELEASE_STARTUP_LOG="$startup_log" bun packages/desktop-electron/scripts/verify-release.ts vX.Y.Z
```

The startup log check reads the latest `app starting` block and verifies it reaches `server ready`, `loading task finished`, and `init step done`. This catches first-launch hangs where the sidecar becomes reachable but the desktop shell never opens the main window.

For Windows releases, run the same fresh-user-data check from PowerShell:

```powershell
$ErrorActionPreference = "Stop"
$smokeHome = "$env:TEMP\folonite-release-smoke\user-data"
$smokeUserData = "$smokeHome\ai.folonite.desktop"
$readyFile = "$smokeUserData\ci-smoke-ready.json"
$appPath = if ($env:FOLONITE_RELEASE_APP_PATH) { $env:FOLONITE_RELEASE_APP_PATH } else { "$env:LOCALAPPDATA\Programs\Folonite\Folonite.exe" }
$startupLog = if ($env:FOLONITE_RELEASE_STARTUP_LOG) { $env:FOLONITE_RELEASE_STARTUP_LOG } else { "$smokeUserData\logs\main.log" }
Remove-Item -Recurse -Force $smokeHome -ErrorAction SilentlyContinue
$previousCiSmoke = $env:FOLONITE_CI_SMOKE
$previousCiSmokeHome = $env:FOLONITE_CI_SMOKE_HOME
$previousStartupLog = $env:FOLONITE_RELEASE_STARTUP_LOG
$env:FOLONITE_CI_SMOKE = "true"
$env:FOLONITE_CI_SMOKE_HOME = $smokeHome
$app = Start-Process -FilePath $appPath -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Path $readyFile) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "Timed out waiting for $readyFile" }
  Start-Sleep -Seconds 1
  $env:FOLONITE_RELEASE_STARTUP_LOG = $startupLog
  bun packages/desktop-electron/scripts/verify-release.ts vX.Y.Z
} finally {
  if ($app -and -not $app.HasExited) { Stop-Process -Id $app.Id -Force }
  if ($null -eq $previousCiSmoke) { Remove-Item Env:FOLONITE_CI_SMOKE -ErrorAction SilentlyContinue } else { $env:FOLONITE_CI_SMOKE = $previousCiSmoke }
  if ($null -eq $previousCiSmokeHome) { Remove-Item Env:FOLONITE_CI_SMOKE_HOME -ErrorAction SilentlyContinue } else { $env:FOLONITE_CI_SMOKE_HOME = $previousCiSmokeHome }
  if ($null -eq $previousStartupLog) { Remove-Item Env:FOLONITE_RELEASE_STARTUP_LOG -ErrorAction SilentlyContinue } else { $env:FOLONITE_RELEASE_STARTUP_LOG = $previousStartupLog }
  Remove-Item -Recurse -Force $smokeHome -ErrorAction SilentlyContinue
}
```

Keep `.zip`, `.blockmap`, and `latest*.yml` assets unless updater requirements are proven safe without them.

If verification fails, check the reported missing or malformed asset first, rerun only the affected build phase, and publish the release only after the verification helper passes.

## 6. Close Release Issues

Only close release-blocking issues after post-release verification passes. Leave a short comment with the release link and the verified artifact names.
