# GitHub-only ISP monitoring setup

## Runtime architecture
- GitHub Actions runs `backend/scripts/runSync.js`.
- The scanner reads credentials and device configuration from the Actions secret `ISP_DEVICES_JSON`.
- MikroTik RouterOS API and OLT SNMP polling are performed by scanner adapters.
- The scan writes `data/devices-status.json`, daily history and a 30-day history index.
- GitHub Pages reads the published JSON. It is a static, read-only frontend.

## Configure device credentials
1. Open repository Settings → Secrets and variables → Actions.
2. Create/update the repository secret named exactly `ISP_DEVICES_JSON`.
3. Store the complete JSON object with a `devices` array; see `config/devices.example.json`.
4. Use dedicated least-privilege read-only credentials.
5. Never commit passwords, SNMP communities, customer identifiers or private device configuration into public files.

## Device onboarding
The Add Device page validates fields and creates a secret JSON download. It cannot write GitHub Secrets or connect to hardware from the browser. For OLT ONU inventory, provide the exact discovery OID from the matching vendor/model/firmware MIB. Optional status/RX/TX OIDs and divisors must be verified against that MIB.

## Run a scan
Open Actions → GitHub-Only On-Demand ISP Scanner → Run workflow. Review the job logs and snapshot commit. A successful/partial scan writes snapshot and history; if every device fails, the scanner exits failed after writing diagnostic data.

## Security and privacy boundary
**The repository and Pages site are public. Do not run a real customer-data scan or publish customer identifiers until the repository/data path is private or a verified data-minimization design is implemented.** Snapshots/history can include device IPs, PPPoE usernames/IP addresses, topology and alert details.

The login page is intentionally disabled because static GitHub Pages has no server-side authentication. Never enter credentials into a browser-only form and never put a GitHub PAT in frontend JavaScript.

## Network reachability boundary
GitHub-hosted runners generally cannot reach private RFC1918 ISP addresses. No self-hosted runner, local machine or external backend is part of this architecture. Therefore private device reachability is not established by the current implementation. Do not claim hardware connection success based on frontend validation or simulated tests.

## Telegram notifications
Optional secrets: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Notification delivery is verified only when a scanner run sends an actual alert under a matching condition; missing secrets cause notification to be skipped.
