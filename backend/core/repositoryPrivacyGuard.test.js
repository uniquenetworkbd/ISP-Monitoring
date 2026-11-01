const test = require('node:test');
const assert = require('node:assert/strict');
const { assertPrivateRepository } = require('../scripts/assertPrivateRepository');

function response(status, body) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('allows scanner only when repository metadata confirms private visibility', async () => {
    const result = await assertPrivateRepository({
        repository: 'owner/private-repo', token: 'test-token',
        fetchImpl: async (url, options) => {
            assert.equal(url, 'https://api.github.com/repos/owner/private-repo');
            assert.equal(options.headers.Authorization, 'Bearer test-token');
            return response(200, { private: true });
        }
    });
    assert.deepEqual(result, { private: true, fullName: 'owner/private-repo' });
});

test('blocks public repositories before customer data scan', async () => {
    await assert.rejects(() => assertPrivateRepository({
        repository: 'owner/public-repo', token: 'test-token',
        fetchImpl: async () => response(200, { private: false })
    }), /Repository is public/);
});

test('fails closed when repository metadata cannot be verified', async () => {
    await assert.rejects(() => assertPrivateRepository({
        repository: 'owner/repo', token: 'test-token',
        fetchImpl: async () => response(403, {})
    }), /privacy check failed with HTTP 403/);
    await assert.rejects(() => assertPrivateRepository({
        repository: 'bad/name/shape', token: 'test-token', fetchImpl: async () => response(200, { private: true })
    }), /missing or invalid/);
    await assert.rejects(() => assertPrivateRepository({
        repository: 'owner/repo', token: '', fetchImpl: async () => response(200, { private: true })
    }), /GITHUB_TOKEN is unavailable/);
});
