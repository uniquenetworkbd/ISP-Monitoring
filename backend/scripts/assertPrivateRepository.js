const API_VERSION = '2022-11-28';

async function assertPrivateRepository(options = {}) {
    const repository = options.repository || process.env.GITHUB_REPOSITORY;
    const token = options.token || process.env.GITHUB_TOKEN;
    const fetchImpl = options.fetchImpl || global.fetch;
    if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
        throw new Error('GITHUB_REPOSITORY is missing or invalid; refusing to run a customer-data scan.');
    }
    if (!token) throw new Error('GITHUB_TOKEN is unavailable; repository privacy cannot be verified.');
    if (typeof fetchImpl !== 'function') throw new Error('Fetch API is unavailable; repository privacy cannot be verified.');
    const response = await fetchImpl('https://api.github.com/repos/' + repository, {
        headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': API_VERSION }
    });
    if (!response.ok) throw new Error('GitHub repository privacy check failed with HTTP ' + response.status + '; refusing to scan.');
    const metadata = await response.json();
    if (metadata.private !== true) {
        throw new Error('Repository is public. Customer/device scan publication is blocked to prevent public exposure of device IPs, PPPoE identifiers, topology and alerts. Make the repository private or implement an approved data-minimization design first.');
    }
    return { private: true, fullName: repository };
}

if (require.main === module) {
    assertPrivateRepository().then(result => {
        console.log('[Privacy Guard] PASS: ' + result.fullName + ' is private.');
    }).catch(error => {
        console.error('[Privacy Guard] BLOCKED: ' + error.message);
        process.exitCode = 1;
    });
}

module.exports = { assertPrivateRepository };
