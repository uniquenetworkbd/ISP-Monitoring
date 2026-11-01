# ISP Monitoring System

A production-oriented ISP monitoring platform foundation for network device monitoring, user synchronization, analytics, and secure administration.

## Project Structure

- `frontend/` — dashboard and UI/UX
- `backend/` — API, device communication, controllers, models, and services
- `package.json` — project metadata and scripts
- `.env` — local environment placeholders (ignored by Git)

## Initial Scope

This repository starts as a clean architectural foundation. Device integrations are isolated behind backend service modules so RouterOS, SNMP, SSH, and future OLT adapters can be implemented without coupling the frontend to network credentials.

## Security

Never commit real API keys, passwords, tokens, SNMP communities, or private credentials. Use local `.env` values and GitHub Actions Secrets for CI/CD.
