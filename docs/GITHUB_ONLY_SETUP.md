# GitHub-only ISP monitoring setup

## Runtime architecture
- GitHub Actions runs `backend/scripts/runSync.js`.
- The scanner reads credentials and device configuration from the Actions secret `ISP_DEVICES_JSON`.
- MikroTik RouterOS API and OLT SNMP polling are performed by the scanner service modules.
- The scan writes `data/devices-status.json` and history artifacts; the workflow commits them.
- GitHub Pages reads published JSON snapshots. No browser-side credential or write token is used.

## Register a device from the configuration page
1. Open the GitHub Pages **Add network device** page.
2. Select MikroTik or OLT and enter the management host/port and device identity.
3. For MikroTik, use a dedicated read-only RouterOS API account.
4. For OLT, enter the exact ONU discovery OID from the matching vendor, model and firmware MIB. Add status/RX/TX OIDs only when verified. Divisors must match the vendor's raw-value encoding.
5. Optionally enter the upstream `parentDeviceId`; it must match an existing device ID.
6. Validate and download the JSON. The page validates configuration syntax only; it does not connect to hardware.
7. In repository Settings → Secrets and variables → Actions, create/update the secret named exactly `ISP_DEVICES_JSON` with the complete JSON content.
8. Delete the downloaded secret file from shared/download locations after storing it safely.
9. Open Actions → GitHub-Only On-Demand ISP Scanner → Run workflow. Review the run logs and published snapshot.

## Supported configuration fields
- MikroTik: `deviceName`, `deviceType: "mikrotik"`, `deviceIP`, `deviceUser`, `devicePass`, optional `devicePort` (default 8728).
- OLT: `deviceName`, `deviceType: "olt"`, `deviceIP`, `snmpCommunity`, optional `snmpPort` (default 161), and required `onuOids.discoveryOid`.
- Optional OLT OID fields: `statusOid`, `rxPowerOid`, `txPowerOid`, `rxPowerDivisor`, `txPowerDivisor`.
- Optional metadata: `vendor`, `model`, `parentDeviceId`.

## Network reachability boundary
A GitHub-hosted runner generally cannot reach private RFC1918 ISP addresses. The current repository design is GitHub-hosted only; therefore private device reachability is **not established** by a valid form or a successful frontend deployment. Do not expose a GitHub PAT in Pages JavaScript to attempt workflow dispatch. A secure browser-to-GitHub secret write or private-network route requires a separately authorized server-side component or an explicitly approved runner architecture, neither of which is part of this GitHub-hosted-only implementation.

## Operational notes
- The dashboard reads the latest committed snapshot and does not poll hardware directly.
- If every configured device fails, a diagnostic snapshot may be written but the scan job exits failed.
- The initial snapshot/history index is empty until a scanner run produces real samples.
