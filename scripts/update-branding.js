#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const BRANDING_FILE = 'branding.json';
const PACKAGE_JSON = 'package.json';
const BACKUP_SUFFIX = '.bak';

async function readJSON(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        process.exit(1);
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error.message);
        process.exit(1);
    }
}

async function backupFile(filePath) {
    try {
        await fs.copyFile(filePath, `${filePath}${BACKUP_SUFFIX}`);
    } catch (error) {
        console.error(`Error backing up ${filePath}:`, error.message);
        process.exit(1);
    }
}

async function restoreBackup(filePath) {
    try {
        await fs.copyFile(`${filePath}${BACKUP_SUFFIX}`, filePath);
        await fs.unlink(`${filePath}${BACKUP_SUFFIX}`);
    } catch (error) {
        console.error(`Error restoring backup of ${filePath}:`, error.message);
        process.exit(1);
    }
}

function validateBranding(branding) {
    const required = [
        'extension.name',
        'extension.displayName',
        'extension.description',
        'extension.version',
        'extension.publisher',
        'extension.author.name',
        'repository.url',
        'repository.homepage',
        'branding.commandPrefix',
        'branding.activityBarTitle',
        'branding.colors.galleryBanner',
        'branding.colors.theme',
        'branding.icons.extension',
        'branding.icons.activityBar'
    ];

    for (const path of required) {
        const value = path.split('.').reduce((obj, key) => obj && obj[key], branding);
        if (!value) {
            throw new Error(`Missing required field: ${path}`);
        }
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;
    if (!semverRegex.test(branding.extension.version)) {
        throw new Error('Invalid version format. Must be semver (e.g., 1.0.0)');
    }

    // Validate URLs
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(branding.repository.url)) {
        throw new Error('Invalid repository URL format');
    }
    if (!urlRegex.test(branding.repository.homepage)) {
        throw new Error('Invalid homepage URL format');
    }

    // Validate color format
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(branding.branding.colors.galleryBanner)) {
        throw new Error('Invalid gallery banner color format. Must be hex (e.g., #4A90E2)');
    }

    // Validate theme
    if (!['dark', 'light'].includes(branding.branding.colors.theme)) {
        throw new Error('Invalid theme. Must be "dark" or "light"');
    }

    // Validate keywords
    if (!branding.keywords || !Array.isArray(branding.keywords) || branding.keywords.length === 0) {
        throw new Error('Must have at least one keyword');
    }
}

async function updatePackageJson(branding) {
    const packageJson = await readJSON(PACKAGE_JSON);
    
    // Update basic extension info
    packageJson.name = branding.extension.name;
    packageJson.displayName = branding.extension.displayName;
    packageJson.description = branding.extension.description;
    packageJson.version = branding.extension.version;
    packageJson.publisher = branding.extension.publisher;
    packageJson.author = branding.extension.author;
    packageJson.repository.url = branding.repository.url;
    packageJson.homepage = branding.repository.homepage;
    packageJson.keywords = branding.keywords;

    // Update gallery banner
    packageJson.galleryBanner = {
        color: branding.branding.colors.galleryBanner,
        theme: branding.branding.colors.theme
    };

    // Update icon
    packageJson.icon = branding.branding.icons.extension;

    // Update contributes section
    if (packageJson.contributes) {
        if (packageJson.contributes.viewsContainers?.activitybar) {
            packageJson.contributes.viewsContainers.activitybar[0].title = branding.branding.activityBarTitle;
            packageJson.contributes.viewsContainers.activitybar[0].icon = branding.branding.icons.activityBar;
        }

        // Update command categories
        if (packageJson.contributes.commands) {
            packageJson.contributes.commands.forEach(command => {
                if (command.category === 'Roo Code') {
                    command.category = branding.branding.commandPrefix;
                }
                if (command.title.startsWith('Roo Code:')) {
                    command.title = command.title.replace('Roo Code:', `${branding.branding.commandPrefix}:`);
                }
            });
        }

        // Update configuration title
        if (packageJson.contributes.configuration?.title === 'Roo Code') {
            packageJson.contributes.configuration.title = branding.branding.commandPrefix;
        }
    }

    await writeJSON(PACKAGE_JSON, packageJson);
}

async function main() {
    try {
        // Check if branding.json exists
        try {
            await fs.access(BRANDING_FILE);
        } catch {
            console.error(`Error: ${BRANDING_FILE} not found. Copy branding.json.template to ${BRANDING_FILE} and customize it.`);
            process.exit(1);
        }

        const branding = await readJSON(BRANDING_FILE);

        // Validate branding configuration
        validateBranding(branding);

        // Backup files before modification
        await backupFile(PACKAGE_JSON);

        // Update files with new branding
        await updatePackageJson(branding);

        // Clean up backups
        await fs.unlink(`${PACKAGE_JSON}${BACKUP_SUFFIX}`);

        console.log('Branding updated successfully!');
    } catch (error) {
        console.error('Error updating branding:', error.message);
        
        // Restore backups if they exist
        try {
            await restoreBackup(PACKAGE_JSON);
            console.log('Restored backup files');
        } catch {
            // Ignore errors during backup restoration
        }
        
        process.exit(1);
    }
}

main();