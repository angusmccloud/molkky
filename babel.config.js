module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          'react-native-paper/babel',
          // Strip console.log/info/debug from production bundles. console.error
          // and console.warn are kept so a future crash reporter can surface them.
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};