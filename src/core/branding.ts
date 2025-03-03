import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface BrandingConfig {
  extension: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    publisher: string;
    author: {
      name: string;
    };
  };
  repository: {
    url: string;
    homepage: string;
  };
  branding: {
    commandPrefix: string;
    activityBarTitle: string;
    colors: {
      galleryBanner: string;
      theme: 'dark' | 'light';
    };
    icons: {
      extension: string;
      activityBar: string;
    };
  };
  keywords: string[];
}

// Default branding configuration
const defaultBranding: BrandingConfig = {
  extension: {
    name: 'my-extension-name',
    displayName: 'My Extension',
    description: 'A brief description of your extension',
    version: '1.0.0',
    publisher: 'YourPublisherName',
    author: {
      name: 'Your Name'
    }
  },
  repository: {
    url: 'https://github.com/yourusername/your-repo',
    homepage: 'https://github.com/yourusername/your-repo'
  },
  branding: {
    commandPrefix: 'My Extension',
    activityBarTitle: 'My Extension',
    colors: {
      galleryBanner: '#4A90E2',
      theme: 'dark'
    },
    icons: {
      extension: 'assets/icons/your-icon.png',
      activityBar: '$(star)'
    }
  },
  keywords: [
    'ai',
    'coding',
    'agent',
    'autonomous',
    'your-keyword'
  ]
};

// Initialize with default branding
let cachedBranding: BrandingConfig = { ...defaultBranding };
let hasLoaded = false;

/**
 * Get the branding configuration
 * @returns The branding configuration
 */
export function getBranding(): BrandingConfig {
  // Only try to load from file once
  if (!hasLoaded) {
    try {
      // Get extension path
      const extensionId = 'RooVeterinaryInc.roo-cline'; // This will be updated by the build process
      const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath || '';
      const configPath = path.join(extensionPath, 'branding.json');
      
      // Read and parse branding.json
      const configContent = fs.readFileSync(configPath, 'utf8');
      const loadedConfig = JSON.parse(configContent) as BrandingConfig;
      
      // Update cached config
      cachedBranding = loadedConfig;
      hasLoaded = true;
    } catch (error) {
      console.warn('Failed to load branding configuration, using defaults');
      hasLoaded = true;
    }
  }
  
  return cachedBranding;
}

/**
 * Get the full extension ID (publisher.name)
 * @returns The extension ID
 */
export function extensionId(): string {
  return `${getBranding().extension.publisher}.${getBranding().extension.name}`;
}

/**
 * Get the display name of the extension
 * @returns The display name
 */
export function displayName(): string {
  return getBranding().extension.displayName;
}

/**
 * Get the extension name (used in package.json)
 * @returns The extension name
 */
export function extensionName(): string {
  return getBranding().extension.name;
}

/**
 * Get the extension description
 * @returns The extension description
 */
export function description(): string {
  return getBranding().extension.description;
}

/**
 * Get the extension version
 * @returns The extension version
 */
export function version(): string {
  return getBranding().extension.version;
}

/**
 * Get the extension publisher
 * @returns The extension publisher
 */
export function publisher(): string {
  return getBranding().extension.publisher;
}

/**
 * Get the command prefix used for all commands
 * @returns The command prefix
 */
export function commandPrefix(): string {
  return getBranding().branding.commandPrefix;
}

/**
 * Create a prefixed command ID
 * @param command The base command name
 * @returns The prefixed command ID
 */
export function prefixCommand(command: string): string {
  return `${getBranding().extension.name}.${command}`;
}

/**
 * Get the repository URL
 * @returns The repository URL
 */
export function repositoryUrl(): string {
  return getBranding().repository.url;
}

/**
 * Get the homepage URL
 * @returns The homepage URL
 */
export function homepageUrl(): string {
  return getBranding().repository.homepage;
}

/**
 * Get the activity bar title
 * @returns The activity bar title
 */
export function activityBarTitle(): string {
  return getBranding().branding.activityBarTitle;
}

/**
 * Get the activity bar icon
 * @returns The activity bar icon
 */
export function activityBarIcon(): string {
  return getBranding().branding.icons.activityBar;
}

/**
 * Get the extension icon path
 * @returns The extension icon path
 */
export function extensionIcon(): string {
  return getBranding().branding.icons.extension;
}

/**
 * Get the gallery banner color
 * @returns The gallery banner color
 */
export function galleryBannerColor(): string {
  return getBranding().branding.colors.galleryBanner;
}

/**
 * Get the gallery banner theme
 * @returns The gallery banner theme
 */
export function galleryBannerTheme(): 'dark' | 'light' {
  return getBranding().branding.colors.theme;
}

/**
 * Get the keywords for the extension
 * @returns The keywords array
 */
export function keywords(): string[] {
  return [...getBranding().keywords];
}