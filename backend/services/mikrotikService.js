/**
 * ============================================================================
 * ENTERPRISE MIKROTIK ROUTEROS API SERVICE
 * ============================================================================
 *
 * Live RouterOS API integration.
 * - Does not fabricate router data.
 * - Opens a fresh API connection per operation.
 * - Closes channel/connection on success and failure.
 * - Supports RouterOS API (8728 by default) and API-SSL (8729 via port).
 */

const { RouterOSClient } = require('routeros-client');

class MikroTikService {
    constructor(host, user, password, port = 8728) {
        if (!host || !user || !password) {
            throw new Error('MikroTik host, user and password are required');
        }

        this.host = host;
        this.user = user;
        this.password = password;
        this.port = Number.parseInt(port, 10) || 8728;
    }

    async connect() {
        const client = new RouterOSClient({
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            timeout: 10
        });

        try {
            return await client.connect();
        } catch (error) {
            throw new Error(`MikroTik Connection Failed [${this.host}]: ${error.message}`);
        }
    }

    async getActivePPPoEUsers() {
        let conn;
        let channel;

        try {
            conn = await this.connect();
            channel = await conn.openChannel('pppoe-active');
            const activeUsers = await channel.write('/ppp/active/print');

            return activeUsers.map(user => ({
                username: user.name,
                address: user.address,
                uptime: user.uptime,
                callerId: user['caller-id'] || 'N/A',
                service: user.service
            }));
        } catch (error) {
            throw new Error(`Failed to fetch PPPoE users from ${this.host}: ${error.message}`);
        } finally {
            if (channel) await channel.close().catch(() => {});
            if (conn) await conn.close().catch(() => {});
        }
    }

    async getSystemResource() {
        let conn;
        let channel;

        try {
            conn = await this.connect();
            channel = await conn.openChannel('sys-resource');
            const resource = await channel.write('/system/resource/print');
            const res = resource[0] || {};

            return {
                uptime: res.uptime,
                cpuLoad: res['cpu-load'],
                freeMemory: res['free-memory'],
                totalMemory: res['total-memory'],
                boardName: res['board-name'],
                version: res.version
            };
        } catch (error) {
            throw new Error(`Failed to fetch system resource from ${this.host}: ${error.message}`);
        } finally {
            if (channel) await channel.close().catch(() => {});
            if (conn) await conn.close().catch(() => {});
        }
    }
}

module.exports = MikroTikService;
