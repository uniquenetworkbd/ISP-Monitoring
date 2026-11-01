# GitHub-only ISP monitoring setup

## Runtime architecture
- GitHub Actions runs `backend/scripts/runSync.js`.
- The scanner reads device configuration from the Actions secret `ISP_DEVICES_JSON`.
- MikroTik RouterOS API and OLT SNMP polling are performed by the existing service modules.
- The scan writes `data/devices-status.json`; the workflow commits and pushes that snapshot.
- The GitHub Pages dashboard reads the published JSON file directly. No MongoDB/API server is used by this dashboard path.

## Configure device credentials
1. Open repository Settings → Secrets and variables → Actions → New repository secret.
2. Name it exactly `ISP_DEVICES_JSON`.
3. Set its value to a JSON object with a `devices` array. Use `config/devices.example.json` as the shape reference.
4. Replace example IPs/usernames/passwords/community strings with real read-only monitoring credentials.
5. Never commit passwords or SNMP community strings into a repository file.

Supported device fields:
- MikroTik: `deviceName`, `deviceType: "mikrotik"`, `deviceIP`, `deviceUser`, `devicePass`, optional `devicePort` (default 8728).
- OLT: `deviceName`, `deviceType: "olt"`, `deviceIP`, `snmpCommunity`, optional `snmpPort` (default 161).

## Run a scan
Open Actions → GitHub-Only On-Demand ISP Scanner → Run workflow. Choose:
- `github-hosted` only if the devices are reachable from GitHub-hosted runners.
- `self-hosted` only after registering a GitHub Actions self-hosted runner inside the ISP network.

A successful/partial scan writes a JSON snapshot and commits it to the branch that started the workflow. If every device is offline, the diagnostic snapshot is still written, but the workflow exits as failed.

## Important operating boundaries
- A GitHub Pages dashboard cannot securely start a workflow by itself; do not place a GitHub PAT in browser JavaScript. Trigger scans from the Actions UI or a separately secured server-side gateway.
- Dashboard refreshes the latest committed snapshot every 60 seconds. It does not poll hardware directly.
- GitHub-hosted runners generally cannot reach private RFC1918 ISP addresses. A self-hosted runner inside the ISP network is the practical option for private devices.
- The legacy Express server, MongoDB models and old database-backed routes remain in the repository for compatibility, but are not used by this GitHub-only scanner/dashboard flow. Do not deploy the legacy server as part of this mode.
- The initial `data/devices-status.json` is an empty placeholder until the first successful scan.
