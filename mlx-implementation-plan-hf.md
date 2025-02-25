# Hugging Face Integration for MLX Provider

## Overview
Add support for downloading and managing models from Hugging Face Hub, with optional authentication for private models.

## 1. Configuration Updates

### API Configuration
Add to `src/shared/api.ts`:
```typescript
export interface ApiHandlerOptions {
    // ... existing options ...
    
    // Hugging Face options
    hfToken?: string;              // Optional auth token
    hfModelCache?: string;         // Local cache directory
    hfForceDownload?: boolean;     // Force re-download
}
```

### Settings Schema
```json
{
  "roo-cline.mlx": {
    "type": "object",
    "properties": {
      // ... existing properties ...
      "huggingface": {
        "type": "object",
        "properties": {
          "token": {
            "type": "string",
            "description": "Hugging Face API token for private models"
          },
          "cacheDir": {
            "type": "string",
            "description": "Directory for caching downloaded models"
          },
          "forceDownload": {
            "type": "boolean",
            "default": false,
            "description": "Force re-download of models"
          }
        }
      }
    }
  }
}
```

## 2. Model Management Service

### Create Model Manager
Create `src/services/mlx/model-manager.ts`:
```typescript
interface ModelDownloadOptions {
    token?: string;
    cacheDir?: string;
    forceDownload?: boolean;
}

interface ModelInfo {
    localPath: string;
    repo: string;
    sha: string;
    lastUpdated: Date;
}

class MlxModelManager {
    // Download model from Hugging Face
    async downloadModel(repo: string, options?: ModelDownloadOptions): Promise<string>;
    
    // Check if model exists locally
    async hasModel(repo: string): Promise<boolean>;
    
    // Get local path for model
    async getModelPath(repo: string): Promise<string>;
    
    // List downloaded models
    async listModels(): Promise<ModelInfo[]>;
    
    // Clean up old models
    async cleanCache(maxAge?: number): Promise<void>;
}
```

### Model Download Implementation
```typescript
import { download } from '@frost-beta/huggingface';

class MlxModelManager {
    async downloadModel(repo: string, options?: ModelDownloadOptions): Promise<string> {
        const cacheDir = options?.cacheDir || this.getDefaultCacheDir();
        
        // Download model using huggingface package
        await download({
            repo,
            token: options?.token,
            cache_dir: cacheDir,
            force_download: options?.forceDownload
        });
        
        // Return local path
        return this.getModelPath(repo);
    }
}
```

## 3. Provider Integration

### Update MLX Provider
Update `src/api/providers/mlx.ts`:
```typescript
export class MlxHandler implements ApiHandler {
    private modelManager: MlxModelManager;
    
    constructor(options: ApiHandlerOptions) {
        this.options = options;
        this.modelManager = new MlxModelManager();
    }
    
    private async initializeLLM() {
        if (this.llm) return;
        
        try {
            const modelPath = await this.resolveModelPath();
            this.llm = await loadLLM(modelPath);
        } catch (error) {
            throw new Error(`MLX initialization error: ${error.message}`);
        }
    }
    
    private async resolveModelPath(): Promise<string> {
        const modelId = this.options.mlxModelId || mlxDefaultModelId;
        
        // If it's a Hugging Face repo, ensure it's downloaded
        if (modelId.includes('/')) {
            return this.modelManager.downloadModel(modelId, {
                token: this.options.hfToken,
                cacheDir: this.options.hfModelCache,
                forceDownload: this.options.hfForceDownload
            });
        }
        
        // Otherwise treat as local path
        return modelId;
    }
}
```

## 4. Implementation Phases

### Phase 1: Basic Download Support
1. Implement model manager with basic download
2. Add configuration options
3. Update provider to use model manager

### Phase 2: Enhanced Features
1. Model caching and versioning
2. Cache cleanup
3. Download progress tracking

### Phase 3: Management Features
1. List downloaded models
2. Model updates
3. Cache optimization

## Technical Considerations

### Cache Management
- Use consistent directory structure
- Track model versions
- Clean up old/unused models
- Handle partial downloads

### Error Handling
- Network issues
- Authentication errors
- Disk space
- Invalid models

### Security
- Token management
- Model verification
- Safe paths

## Next Steps

1. Implement basic model manager
2. Add configuration options
3. Update provider implementation
4. Add cache management
5. Test with various models

## Success Criteria

1. Successfully download models from Hugging Face
2. Handle private models with authentication
3. Efficient caching system
4. Clean error handling
5. Good user experience