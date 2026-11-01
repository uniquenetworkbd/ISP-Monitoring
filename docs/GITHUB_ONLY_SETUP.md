# GitHub-only ISP monitoring setup

## Privacy gate — mandatory
The repository is public. The on-demand scanner now calls `backend/scripts/assertPrivateRepository.js` before installing dependencies or accessing device secrets. It fails closed unless GitHub API metadata confirms `private: true`. Do not remove or bypass this guard for customer-data scans.

## Runtime architecture
- GitHub Actions runs `backend/scripts/runSync.js`.
- Credentials/configuration are read from Actions secret `ISP_DEVICES_JSON`.
- MikroTik RouterOS API and OLT SNMP polling are performed by scanner adapters.
- Scan output is committed to `data/devices-status.json`, daily history and history index.
- GitHub Pages reads published JSON and is read-only.

## Configure device credentials
1. After the repository is private, open Settings → Secrets and variables → Actions.
2. Create/update `ISP_DEVICES_JSON` with the full devices array.
3. Use dedicated least-privilege read-only credentials. Never commit passwords, SNMP communities or customer identifiers.
4. OLT ONU inventory requires exact discovery OID from the matching vendor/model/firmware MIB. Optional status/RX/TX OIDs and divisors must be verified.

## Run a scan
Open Actions → GitHub-Only On-Demand ISP Scanner → Run workflow. The privacy guard executes first. Review logs and snapshot commit. A successful form validation is not a connection test.

## Access and network boundaries
The static login page is disabled; no server-side authentication exists. GitHub-hosted runners generally cannot reach private RFC1918 ISP addresses. No self-hosted runner, local machine or external backend is part of this design. Real device connectivity is therefore not verified.
