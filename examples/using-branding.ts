// Example of using the branding module in code

import { 
  displayName, 
  extensionId, 
  commandPrefix, 
  prefixCommand,
  repositoryUrl,
  activityBarTitle,
  extensionIcon
} from '../src/core/branding';

// Extension activation example
export function activate(context: any) {
  console.log(`Activating ${displayName()} extension`);
  
  // Register commands using prefixed command IDs
  const startCommand = prefixCommand('start');
  const stopCommand = prefixCommand('stop');
  
  // Use extension ID for API calls
  const extensionPath = context.extensionPath;
  console.log(`Extension ID: ${extensionId()}`);
  
  // Use command prefix for UI elements
  const buttonLabel = `${commandPrefix()}: Start`;
  
  // Use repository URL for links
  const repoLink = repositoryUrl();
  
  // Use activity bar title for views
  const viewTitle = activityBarTitle();
  
  // Use extension icon for UI elements
  const iconPath = extensionIcon();
}

// Configuration example
export function getConfiguration() {
  return {
    // Use prefixCommand for configuration keys
    configKey: prefixCommand('apiKey'),
    
    // Use displayName for UI labels
    configTitle: displayName(),
    
    // Use commandPrefix for categories
    category: commandPrefix()
  };
}

// Command registration example
export function registerCommands(context: any) {
  // Register a command with a prefixed ID
  const disposable = context.commands.registerCommand(
    prefixCommand('start'),
    () => {
      console.log(`Starting ${displayName()}`);
    }
  );
  
  context.subscriptions.push(disposable);
}