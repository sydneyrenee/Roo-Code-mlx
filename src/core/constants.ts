import {
  extensionName,
  displayName,
  description,
  version,
  publisher,
  extensionId,
  prefixCommand,
  repositoryUrl,
  homepageUrl,
  commandPrefix,
  activityBarTitle,
  activityBarIcon,
  extensionIcon,
  galleryBannerColor,
  galleryBannerTheme,
  keywords
} from './branding';

// Extension information
export const EXTENSION_NAME = extensionName;
export const DISPLAY_NAME = displayName;
export const DESCRIPTION = description;
export const VERSION = version;
export const PUBLISHER = publisher;
export const EXTENSION_ID = extensionId;
export const AUTHOR_NAME = () => displayName().split(' ')[0]; // Simplified approach, consider enhancing

// Repository information
export const REPOSITORY_URL = repositoryUrl;
export const HOMEPAGE_URL = homepageUrl;

// Command helpers
export const PREFIX_COMMAND = prefixCommand;

// Branding elements
export const COMMAND_PREFIX = commandPrefix;
export const ACTIVITY_BAR_TITLE = activityBarTitle;
export const GALLERY_BANNER_COLOR = galleryBannerColor;
export const THEME = galleryBannerTheme;
export const EXTENSION_ICON = extensionIcon;
export const ACTIVITY_BAR_ICON = activityBarIcon;

// Keywords
export const KEYWORDS = keywords;

// User information for Git operations
export const GIT_USER_NAME = () => displayName().split(' ')[0]; // Simplified approach
export const GIT_USER_EMAIL = () => 'noreply@example.com';

// URL helpers
export const MARKETPLACE_URL = () => `https://marketplace.visualstudio.com/items?itemName=${extensionId()}`;
export const OPEN_VSX_URL = () => `https://open-vsx.org/extension/${publisher()}/${extensionName()}`;
export const GITHUB_REPO = () => repositoryUrl().replace(/\.git$/, '');
export const GITHUB_ISSUES = () => `${GITHUB_REPO()}/issues`;
export const GITHUB_DISCUSSIONS = () => `${GITHUB_REPO()}/discussions`;