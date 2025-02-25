"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadowCheckpointService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path = __importStar(require("path"));
const globby_1 = require("globby");
const simple_git_1 = __importDefault(require("simple-git"));
const constants_1 = require("./constants");
class ShadowCheckpointService {
    taskId;
    git;
    shadowDir;
    workspaceDir;
    log;
    strategy = "shadow";
    version = 1;
    _baseHash;
    get baseHash() {
        return this._baseHash;
    }
    set baseHash(value) {
        this._baseHash = value;
    }
    shadowGitDir;
    shadowGitConfigWorktree;
    constructor(taskId, git, shadowDir, workspaceDir, log) {
        this.taskId = taskId;
        this.git = git;
        this.shadowDir = shadowDir;
        this.workspaceDir = workspaceDir;
        this.log = log;
        this.shadowGitDir = path.join(this.shadowDir, "tasks", this.taskId, "checkpoints", ".git");
    }
    async initShadowGit() {
        const fileExistsAtPath = (path) => promises_1.default
            .access(path)
            .then(() => true)
            .catch(() => false);
        if (await fileExistsAtPath(this.shadowGitDir)) {
            this.log(`[initShadowGit] shadow git repo already exists at ${this.shadowGitDir}`);
            const worktree = await this.getShadowGitConfigWorktree();
            if (worktree !== this.workspaceDir) {
                throw new Error(`Checkpoints can only be used in the original workspace: ${worktree} !== ${this.workspaceDir}`);
            }
            this.baseHash = await this.git.revparse(["--abbrev-ref", "HEAD"]);
        }
        else {
            this.log(`[initShadowGit] creating shadow git repo at ${this.workspaceDir}`);
            await this.git.init();
            await this.git.addConfig("core.worktree", this.workspaceDir); // Sets the working tree to the current workspace.
            await this.git.addConfig("commit.gpgSign", "false"); // Disable commit signing for shadow repo.
            await this.git.addConfig("user.name", "Roo Code");
            await this.git.addConfig("user.email", "noreply@example.com");
            let lfsPatterns = []; // Get LFS patterns from workspace if they exist.
            try {
                const attributesPath = path.join(this.workspaceDir, ".gitattributes");
                if (await fileExistsAtPath(attributesPath)) {
                    lfsPatterns = (await promises_1.default.readFile(attributesPath, "utf8"))
                        .split("\n")
                        .filter((line) => line.includes("filter=lfs"))
                        .map((line) => line.split(" ")[0].trim());
                }
            }
            catch (error) {
                this.log(`[initShadowGit] failed to read .gitattributes: ${error instanceof Error ? error.message : String(error)}`);
            }
            // Add basic excludes directly in git config, while respecting any
            // .gitignore in the workspace.
            // .git/info/exclude is local to the shadow git repo, so it's not
            // shared with the main repo - and won't conflict with user's
            // .gitignore.
            await promises_1.default.mkdir(path.join(this.shadowGitDir, "info"), { recursive: true });
            const excludesPath = path.join(this.shadowGitDir, "info", "exclude");
            await promises_1.default.writeFile(excludesPath, [...constants_1.GIT_EXCLUDES, ...lfsPatterns].join("\n"));
            await this.stageAll();
            const { commit } = await this.git.commit("initial commit", { "--allow-empty": null });
            this.baseHash = commit;
            this.log(`[initShadowGit] base commit is ${commit}`);
        }
    }
    async stageAll() {
        await this.renameNestedGitRepos(true);
        try {
            await this.git.add(".");
        }
        catch (error) {
            this.log(`[stageAll] failed to add files to git: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            await this.renameNestedGitRepos(false);
        }
    }
    // Since we use git to track checkpoints, we need to temporarily disable
    // nested git repos to work around git's requirement of using submodules for
    // nested repos.
    async renameNestedGitRepos(disable) {
        // Find all .git directories that are not at the root level.
        const gitPaths = await (0, globby_1.globby)("**/.git" + (disable ? "" : constants_1.GIT_DISABLED_SUFFIX), {
            cwd: this.workspaceDir,
            onlyDirectories: true,
            ignore: [".git"], // Ignore root level .git.
            dot: true,
            markDirectories: false,
        });
        // For each nested .git directory, rename it based on operation.
        for (const gitPath of gitPaths) {
            const fullPath = path.join(this.workspaceDir, gitPath);
            let newPath;
            if (disable) {
                newPath = fullPath + constants_1.GIT_DISABLED_SUFFIX;
            }
            else {
                newPath = fullPath.endsWith(constants_1.GIT_DISABLED_SUFFIX)
                    ? fullPath.slice(0, -constants_1.GIT_DISABLED_SUFFIX.length)
                    : fullPath;
            }
            try {
                await promises_1.default.rename(fullPath, newPath);
                this.log(`${disable ? "disabled" : "enabled"} nested git repo ${gitPath}`);
            }
            catch (error) {
                this.log(`failed to ${disable ? "disable" : "enable"} nested git repo ${gitPath}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    async getShadowGitConfigWorktree() {
        if (!this.shadowGitConfigWorktree) {
            try {
                this.shadowGitConfigWorktree = (await this.git.getConfig("core.worktree")).value || undefined;
            }
            catch (error) {
                this.log(`[getShadowGitConfigWorktree] failed to get core.worktree: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return this.shadowGitConfigWorktree;
    }
    async saveCheckpoint(message) {
        try {
            const startTime = Date.now();
            await this.stageAll();
            const result = await this.git.commit(message);
            if (result.commit) {
                const duration = Date.now() - startTime;
                this.log(`[saveCheckpoint] saved checkpoint ${result.commit} in ${duration}ms`);
                return result;
            }
            else {
                return undefined;
            }
        }
        catch (error) {
            this.log(`[saveCheckpoint] failed to create checkpoint: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    async restoreCheckpoint(commitHash) {
        const start = Date.now();
        await this.git.clean("f", ["-d", "-f"]);
        await this.git.reset(["--hard", commitHash]);
        const duration = Date.now() - start;
        this.log(`[restoreCheckpoint] restored checkpoint ${commitHash} in ${duration}ms`);
    }
    async getDiff({ from, to }) {
        const result = [];
        if (!from) {
            from = (await this.git.raw(["rev-list", "--max-parents=0", "HEAD"])).trim();
        }
        // Stage all changes so that untracked files appear in diff summary.
        await this.stageAll();
        const { files } = to ? await this.git.diffSummary([`${from}..${to}`]) : await this.git.diffSummary([from]);
        const cwdPath = (await this.getShadowGitConfigWorktree()) || this.workspaceDir || "";
        for (const file of files) {
            const relPath = file.file;
            const absPath = path.join(cwdPath, relPath);
            const before = await this.git.show([`${from}:${relPath}`]).catch(() => "");
            const after = to
                ? await this.git.show([`${to}:${relPath}`]).catch(() => "")
                : await promises_1.default.readFile(absPath, "utf8").catch(() => "");
            result.push({ paths: { relative: relPath, absolute: absPath }, content: { before, after } });
        }
        return result;
    }
    static async create({ taskId, shadowDir, workspaceDir, log = console.log }) {
        try {
            await (0, simple_git_1.default)().version();
        }
        catch (error) {
            throw new Error("Git must be installed to use checkpoints.");
        }
        const homedir = os_1.default.homedir();
        const desktopPath = path.join(homedir, "Desktop");
        const documentsPath = path.join(homedir, "Documents");
        const downloadsPath = path.join(homedir, "Downloads");
        const protectedPaths = [homedir, desktopPath, documentsPath, downloadsPath];
        if (protectedPaths.includes(workspaceDir)) {
            throw new Error(`Cannot use checkpoints in ${workspaceDir}`);
        }
        const checkpointsDir = path.join(shadowDir, "tasks", taskId, "checkpoints");
        await promises_1.default.mkdir(checkpointsDir, { recursive: true });
        const gitDir = path.join(checkpointsDir, ".git");
        const git = (0, simple_git_1.default)(path.dirname(gitDir));
        log(`[create] taskId = ${taskId}, workspaceDir = ${workspaceDir}, shadowDir = ${shadowDir}`);
        const service = new ShadowCheckpointService(taskId, git, shadowDir, workspaceDir, log);
        await service.initShadowGit();
        return service;
    }
}
exports.ShadowCheckpointService = ShadowCheckpointService;
//# sourceMappingURL=ShadowCheckpointService.js.map