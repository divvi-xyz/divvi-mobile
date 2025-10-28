module.exports = {
  branches: [
    'stable',
    {
      name: 'main',
      prerelease: 'alpha',
      channel: 'alpha',
    },
  ],
  preset: 'conventionalcommits',
  // Skipping github comments and labels as it is not currently working correctly, see https://github.com/anolilab/semantic-release/issues/7
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    // Conditionally include npm plugin - skip during dry runs to avoid OIDC token requirement
    ...(process.env.SKIP_NPM_PLUGIN ? [] : ['@semantic-release/npm']),
    [
      '@semantic-release/github',
      {
        successComment: false,
        releasedLabels: false,
      },
    ],
  ],
}
