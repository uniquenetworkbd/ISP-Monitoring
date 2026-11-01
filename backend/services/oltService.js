/**
 * ============================================================================
 * OLT SNMP POLLING SERVICE
 * ============================================================================
 *
 * Performs real SNMP GET requests against an OLT. No sample data is generated.
 * A fresh session is created and closed for each request so one poll cannot
 * leave the service unusable for the next poll.
 *
 * Security:
 * - Configure a read-only SNMP community through your device configuration.
 * - Do not expose SNMP/UDP 161 to the public Internet.
 * - SNMPv2c community strings are transmitted without encryption.
 */

const snmp = require('net-snmp');

class OLTService {
    constructor(host, community = 'public', version = snmp.Version2c, options = {}) {
        if (!host || typeof host !== 'string') {
            throw new Error('OLT host/IP address is required');
        }
        if (!community || typeof community !== 'string') {
            throw new Error('SNMP community is required');
        }

        this.host = host;
        this.community = community;
        this.version = version;
        this.timeout = Number(options.timeout) > 0 ? Number(options.timeout) : 5000;
        this.retries = Number.isInteger(options.retries) && options.retries >= 0
            ? options.retries
            : 1;
        this.port = Number(options.port) > 0 ? Number(options.port) : 161;
    }

    createSession() {
        return snmp.createSession(this.host, this.community, {
            port: this.port,
            version: this.version,
            timeout: this.timeout,
            retries: this.retries,
            transport: 'udp4'
        });
    }

    /**
     * Fetch one or more OIDs and always close the SNMP session.
     * Returns an object keyed by OID. SNMP varbind errors reject the request.
     */
    async getSNMPData(oids) {
        if (!Array.isArray(oids) || oids.length === 0) {
            throw new Error('At least one SNMP OID is required');
        }
        if (oids.some(oid => typeof oid !== 'string' || !/^(\d+\.)*\d+$/.test(oid))) {
            throw new Error('Invalid SNMP OID supplied');
        }

        const session = this.createSession();

        try {
            const varbinds = await new Promise((resolve, reject) => {
                session.get(oids, (error, response) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(response || []);
                });
            });

            const results = {};
            for (const varbind of varbinds) {
                if (snmp.isVarBindError(varbind)) {
                    throw new Error(`OID ${varbind.oid}: ${snmp.varBindError(varbind)}`);
                }

                const value = Buffer.isBuffer(varbind.value)
                    ? varbind.value.toString('utf8')
                    : String(varbind.value);

                results[varbind.oid] = value;
            }
            return results;
        } catch (error) {
            throw new Error(`SNMP request failed for OLT [${this.host}]: ${error.message}`);
        } finally {
            try {
                session.close();
            } catch (closeError) {
                // Preserve the original polling result/error if session cleanup fails.
            }
        }
    }

    /**
     * Read standard MIB-II system description and uptime.
     */
    async getOLTSystemStatus() {
        const sysDescrOid = '1.3.6.1.2.1.1.1.0';
        const sysUpTimeOid = '1.3.6.1.2.1.1.3.0';

        try {
            const data = await this.getSNMPData([sysDescrOid, sysUpTimeOid]);
            return {
                host: this.host,
                deviceDescription: data[sysDescrOid] || 'Unknown OLT Device',
                uptime: data[sysUpTimeOid] || 'N/A',
                status: 'Online',
                checkedAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to fetch OLT status for ${this.host}: ${error.message}`);
        }
    }

    /**
     * Read caller-supplied vendor-specific ONU optical-power OIDs.
     * OID mapping differs by Huawei/ZTE/VSOL/BDCOM model and firmware.
     */
    async getOnuOpticalPower(onuIndexOids = []) {
        if (!Array.isArray(onuIndexOids)) {
            throw new Error('ONU optical-power OIDs must be supplied as an array');
        }
        if (onuIndexOids.length === 0) return [];

        try {
            return await this.getSNMPData(onuIndexOids);
        } catch (error) {
            throw new Error(`Failed to fetch ONU optical power from OLT ${this.host}: ${error.message}`);
        }
    }
}

module.exports = OLTService;
