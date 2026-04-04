const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Merge with Expo's workspace watch list so packages/* stay indexed (SHA-1 / Fast Refresh).
const defaultWatchFolders = config.watchFolders ?? [];
config.watchFolders = [...new Set([...defaultWatchFolders, monorepoRoot])];

const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
config.resolver.nodeModulesPaths = [
  ...new Set([
    ...(config.resolver.nodeModulesPaths ?? []),
    mobileNodeModules,
    rootNodeModules,
  ]),
];

// pnpm: workspace packages are linked; Metro should follow symlinks when resolving.
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

const avatarConstantsEntry = path.resolve(
  monorepoRoot,
  'packages/avatar-constants/src/index.ts',
);

/** Metro occasionally fails to resolve this screen in pnpm monorepo + web; force absolute path. */
const dungeonDiscoveryScreenPath = path.resolve(
  projectRoot,
  'src/screens/DungeonDiscoveryScreen.tsx',
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@repo/avatar-constants') {
    return { type: 'sourceFile', filePath: avatarConstantsEntry };
  }
  const norm = String(moduleName).replace(/\\/g, '/');
  if (
    fs.existsSync(dungeonDiscoveryScreenPath) &&
    (norm.endsWith('/DungeonDiscoveryScreen') ||
      norm.endsWith('/DungeonDiscoveryScreen.tsx') ||
      norm === 'DungeonDiscoveryScreen')
  ) {
    return { type: 'sourceFile', filePath: dungeonDiscoveryScreenPath };
  }
  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@repo/avatar-constants': path.resolve(monorepoRoot, 'packages/avatar-constants'),
  lodash: path.resolve(__dirname, 'node_modules/lodash'),
  'react-native-share': path.resolve(__dirname, 'node_modules/react-native-share'),
};

// Configure server for Replit environment
config.server = {
  ...config.server,
  port: 5000,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
