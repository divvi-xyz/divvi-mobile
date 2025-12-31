/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: [
    'stable',
    {
      name: 'main',
      prerelease: 'alpha',
    },
  ],
  preset: 'conventionalcommits',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    // Conditionally include npm plugin - skip during dry runs to avoid OIDC token requirement
    ...(process.env.SKIP_NPM_PLUGIN ? [] : ['@semantic-release/npm']),
    [
      '@semantic-release/github',
      // Skipping github comments and labels as it is not currently working correctly,
      // see https://github.com/anolilab/semantic-release/issues/7
      {
        successComment: false,
        releasedLabels: false,
      },
    ],
  ],
}
