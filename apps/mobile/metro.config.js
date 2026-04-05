const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch workspace packages
config.watchFolders = [workspaceRoot];

// Force single React instance across all workspace packages
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
};

// Singleton packages that must resolve to a single instance across the monorepo
const singletons = ["react", "react-dom", "react-native", "zustand"];
const singletonPaths = Object.fromEntries(
  singletons.map((pkg) => [
    pkg,
    require.resolve(path.join(projectRoot, "node_modules", pkg)),
  ])
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force singleton packages to resolve from the app root
  const singletonPath = singletonPaths[moduleName];
  if (singletonPath) {
    return { filePath: singletonPath, type: "sourceFile" };
  }

  // Resolve .js imports to .ts/.tsx files (TypeScript ESM convention)
  if (moduleName.endsWith(".js")) {
    try {
      return context.resolveRequest(
        context,
        moduleName.replace(/\.js$/, ".ts"),
        platform
      );
    } catch (_) {}
    try {
      return context.resolveRequest(
        context,
        moduleName.replace(/\.js$/, ".tsx"),
        platform
      );
    } catch (_) {}
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
