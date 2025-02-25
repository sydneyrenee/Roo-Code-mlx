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
exports.LocalCheckpointService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importStar(require("simple-git"));
/**
 * The CheckpointService provides a mechanism for storing a snapshot of the
 * current VSCode workspace each time a Roo Code tool is executed. It uses Git
 * under the hood.
 *
 * HOW IT WORKS
 *
 * Two branches are used:
 *  - A main branch for normal operation (the branch you are currently on).
 *  - A hidden branch for storing checkpoints.
 *
 * Saving a checkpoint:
 *  - A temporary branch is created to store the current state.
 *  - All changes (including untracked files) are staged and committed on the temp branch.
 *  - The hidden branch is reset to match main.
 *  - The temporary branch commit is cherry-picked onto the hidden branch.
 *  - The workspace is restored to its original state and the temp branch is deleted.
 *
 * Restoring a checkpoint:
 *  - The workspace is restored to the state of the specified checkpoint using
 *    `git restore` and `git clean`.
 *
 * This approach allows for:
 *  - Non-destructive version control (main branch remains untouched).
 *  - Preservation of the full history of checkpoints.
 *  - Safe restoration to any previous checkpoint.
 *  - Atomic checkpoint operations with proper error recovery.
 *
 * NOTES
 *
 *  - Git must be installed.
 *  - If the current working directory is not a Git repository, we will
 *    initialize a new one with a .gitkeep file.
 *  - If you manually edit files and then restore a checkpoint, the changes
 *    will be lost. Addressing this adds some complexity to the implementation
 *    and it's not clear whether it's worth it.
 */
class LocalCheckpointService {
    taskId;
    git;
    workspaceDir;
    mainBranch;
    _baseHash;
    hiddenBranch;
    log;
    static USER_NAME = "Roo Code";
    static USER_EMAIL = "support@roocode.com";
    static CHECKPOINT_BRANCH = "roo-code-checkpoints";
    static STASH_BRANCH = "roo-code-stash";
    strategy = "local";
    version = 1;
    get baseHash() {
        return this._baseHash;
    }
    constructor(taskId, git, workspaceDir, mainBranch, _baseHash, hiddenBranch, log) {
        this.taskId = taskId;
        this.git = git;
        this.workspaceDir = workspaceDir;
        this.mainBranch = mainBranch;
        this._baseHash = _baseHash;
        this.hiddenBranch = hiddenBranch;
        this.log = log;
    }
    async ensureBranch(expectedBranch) {
        const branch = await this.git.revparse(["--abbrev-ref", "HEAD"]);
        if (branch.trim() !== expectedBranch) {
            throw new Error(`Git branch mismatch: expected '${expectedBranch}' but found '${branch}'`);
        }
    }
    async getDiff({ from, to }) {
        const result = [];
        if (!from) {
            from = this.baseHash;
        }
        const { files } = await this.git.diffSummary([`${from}..${to}`]);
        for (const file of files.filter((f) => !f.binary)) {
            const relPath = file.file;
            const absPath = path_1.default.join(this.workspaceDir, relPath);
            const before = await this.git.show([`${from}:${relPath}`]).catch(() => "");
            const after = to
                ? await this.git.show([`${to}:${relPath}`]).catch(() => "")
                : await promises_1.default.readFile(absPath, "utf8").catch(() => "");
            result.push({
                paths: { relative: relPath, absolute: absPath },
                content: { before, after },
            });
        }
        return result;
    }
    async restoreMain({ branch, stashSha, force = false, }) {
        let currentBranch = await this.git.revparse(["--abbrev-ref", "HEAD"]);
        if (currentBranch !== this.mainBranch) {
            if (force) {
                try {
                    await this.git.checkout(["-f", this.mainBranch]);
                }
                catch (err) {
                    this.log(`[restoreMain] failed to force checkout ${this.mainBranch}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            else {
                try {
                    await this.git.checkout(this.mainBranch);
                }
                catch (err) {
                    this.log(`[restoreMain] failed to checkout ${this.mainBranch}: ${err instanceof Error ? err.message : String(err)}`);
                    // Escalate to a forced checkout if we can't checkout the
                    // main branch under normal circumstances.
                    currentBranch = await this.git.revparse(["--abbrev-ref", "HEAD"]);
                    if (currentBranch !== this.mainBranch) {
                        await this.git.checkout(["-f", this.mainBranch]).catch(() => { });
                    }
                }
            }
        }
        currentBranch = await this.git.revparse(["--abbrev-ref", "HEAD"]);
        if (currentBranch !== this.mainBranch) {
            throw new Error(`Unable to restore ${this.mainBranch}`);
        }
        if (stashSha) {
            this.log(`[restoreMain] applying stash ${stashSha}`);
            try {
                await this.git.raw(["stash", "apply", "--index", stashSha]);
            }
            catch (err) {
                this.log(`[restoreMain] Failed to apply stash: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        this.log(`[restoreMain] restoring from ${branch} branch`);
        try {
            await this.git.raw(["restore", "--source", branch, "--worktree", "--", "."]);
        }
        catch (err) {
            this.log(`[restoreMain] Failed to restore branch: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async saveCheckpoint(message) {
        const startTime = Date.now();
        await this.ensureBranch(this.mainBranch);
        const stashSha = (await this.git.raw(["stash", "create"])).trim();
        const latestSha = await this.git.revparse([this.hiddenBranch]);
        /**
         * PHASE: Create stash
         * Mutations:
         *   - Create branch
         *   - Change branch
         */
        const stashBranch = `${LocalCheckpointService.STASH_BRANCH}-${Date.now()}`;
        await this.git.checkout(["-b", stashBranch]);
        this.log(`[saveCheckpoint] created and checked out ${stashBranch}`);
        /**
         * Phase: Stage stash
         * Mutations: None
         * Recovery:
         *   - UNDO: Create branch
         *   - UNDO: Change branch
         */
        try {
            await this.git.add(["-A"]);
        }
        catch (err) {
            this.log(`[saveCheckpoint] failed in stage stash phase: ${err instanceof Error ? err.message : String(err)}`);
            await this.restoreMain({ branch: stashBranch, stashSha, force: true });
            await this.git.branch(["-D", stashBranch]).catch(() => { });
            throw err;
        }
        /**
         * Phase: Commit stash
         * Mutations:
         *   - Commit stash
         *   - Change branch
         * Recovery:
         *   - UNDO: Create branch
         *   - UNDO: Change branch
         */
        let stashCommit;
        try {
            stashCommit = await this.git.commit(message, undefined, { "--no-verify": null });
            this.log(`[saveCheckpoint] stashCommit: ${message} -> ${JSON.stringify(stashCommit)}`);
        }
        catch (err) {
            this.log(`[saveCheckpoint] failed in stash commit phase: ${err instanceof Error ? err.message : String(err)}`);
            await this.restoreMain({ branch: stashBranch, stashSha, force: true });
            await this.git.branch(["-D", stashBranch]).catch(() => { });
            throw err;
        }
        if (!stashCommit) {
            this.log("[saveCheckpoint] no stash commit");
            await this.restoreMain({ branch: stashBranch, stashSha });
            await this.git.branch(["-D", stashBranch]);
            return undefined;
        }
        /**
         * PHASE: Diff
         * Mutations:
         *   - Checkout hidden branch
         * Recovery:
         *   - UNDO: Create branch
         *   - UNDO: Change branch
         *   - UNDO: Commit stash
         */
        let diff;
        try {
            diff = await this.git.diff([latestSha, stashBranch]);
        }
        catch (err) {
            this.log(`[saveCheckpoint] failed in diff phase: ${err instanceof Error ? err.message : String(err)}`);
            await this.restoreMain({ branch: stashBranch, stashSha, force: true });
            await this.git.branch(["-D", stashBranch]).catch(() => { });
            throw err;
        }
        if (!diff) {
            this.log("[saveCheckpoint] no diff");
            await this.restoreMain({ branch: stashBranch, stashSha });
            await this.git.branch(["-D", stashBranch]);
            return undefined;
        }
        /**
         * PHASE: Reset
         * Mutations:
         *   - Reset hidden branch
         * Recovery:
         *   - UNDO: Create branch
         *   - UNDO: Change branch
         *   - UNDO: Commit stash
         */
        try {
            await this.git.checkout(this.hiddenBranch);
            this.log(`[saveCheckpoint] checked out ${this.hiddenBranch}`);
            await this.git.reset(["--hard", this.mainBranch]);
            this.log(`[saveCheckpoint] reset ${this.hiddenBranch}`);
        }
        catch (err) {
            this.log(`[saveCheckpoint] failed in reset phase: ${err instanceof Error ? err.message : String(err)}`);
            await this.restoreMain({ branch: stashBranch, stashSha, force: true });
            await this.git.branch(["-D", stashBranch]).catch(() => { });
            throw err;
        }
        /**
         * PHASE: Cherry pick
         * Mutations:
         *   - Hidden commit (NOTE: reset on hidden branch no longer needed in
         *     success scenario.)
         * Recovery:
         *   - UNDO: Create branch
         *   - UNDO: Change branch
         *   - UNDO: Commit stash
         *   - UNDO: Reset hidden branch
         */
        let commit = "";
        try {
            try {
                await this.git.raw(["cherry-pick", stashBranch]);
            }
            catch (err) {
                // Check if we're in the middle of a cherry-pick.
                // If the cherry-pick resulted in an empty commit (e.g., only
                // deletions) then complete it with --allow-empty.
                // Otherwise, rethrow the error.
                if ((0, fs_1.existsSync)(path_1.default.join(this.workspaceDir, ".git/CHERRY_PICK_HEAD"))) {
                    await this.git.raw(["commit", "--allow-empty", "--no-edit"]);
                }
                else {
                    throw err;
                }
            }
            commit = await this.git.revparse(["HEAD"]);
            this.log(`[saveCheckpoint] cherry-pick commit = ${commit}`);
        }
        catch (err) {
            this.log(`[saveCheckpoint] failed in cherry pick phase: ${err instanceof Error ? err.message : String(err)}`);
            await this.git.reset(["--hard", latestSha]).catch(() => { });
            await this.restoreMain({ branch: stashBranch, stashSha, force: true });
            await this.git.branch(["-D", stashBranch]).catch(() => { });
            throw err;
        }
        await this.restoreMain({ branch: stashBranch, stashSha });
        await this.git.branch(["-D", stashBranch]);
        // We've gotten reports that checkpoints can be slow in some cases, so
        // we'll log the duration of the checkpoint save.
        const duration = Date.now() - startTime;
        this.log(`[saveCheckpoint] saved checkpoint ${commit} in ${duration}ms`);
        return { commit };
    }
    async restoreCheckpoint(commitHash) {
        const startTime = Date.now();
        await this.ensureBranch(this.mainBranch);
        await this.git.clean([simple_git_1.CleanOptions.FORCE, simple_git_1.CleanOptions.RECURSIVE]);
        await this.git.raw(["restore", "--source", commitHash, "--worktree", "--", "."]);
        const duration = Date.now() - startTime;
        this.log(`[restoreCheckpoint] restored checkpoint ${commitHash} in ${duration}ms`);
    }
    static async create({ taskId, workspaceDir, log = console.log }) {
        const git = (0, simple_git_1.default)(workspaceDir);
        const version = await git.version();
        if (!version?.installed) {
            throw new Error(`Git is not installed. Please install Git if you wish to use checkpoints.`);
        }
        if (!workspaceDir || !(0, fs_1.existsSync)(workspaceDir)) {
            throw new Error(`Base directory is not set or does not exist.`);
        }
        const { currentBranch, currentSha, hiddenBranch } = await LocalCheckpointService.initRepo(git, {
            taskId,
            workspaceDir,
            log,
        });
        log(`[create] taskId = ${taskId}, workspaceDir = ${workspaceDir}, currentBranch = ${currentBranch}, currentSha = ${currentSha}, hiddenBranch = ${hiddenBranch}`);
        return new LocalCheckpointService(taskId, git, workspaceDir, currentBranch, currentSha, hiddenBranch, log);
    }
    static async initRepo(git, { taskId, workspaceDir, log }) {
        const isExistingRepo = (0, fs_1.existsSync)(path_1.default.join(workspaceDir, ".git"));
        if (!isExistingRepo) {
            await git.init();
            log(`[initRepo] Initialized new Git repository at ${workspaceDir}`);
        }
        const globalUserName = await git.getConfig("user.name", "global");
        const localUserName = await git.getConfig("user.name", "local");
        const userName = localUserName.value || globalUserName.value;
        const globalUserEmail = await git.getConfig("user.email", "global");
        const localUserEmail = await git.getConfig("user.email", "local");
        const userEmail = localUserEmail.value || globalUserEmail.value;
        // Prior versions of this service indiscriminately set the local user
        // config, and it should not override the global config. To address
        // this we remove the local user config if it matches the default
        // user name and email and there's a global config.
        if (globalUserName.value && localUserName.value === LocalCheckpointService.USER_NAME) {
            await git.raw(["config", "--unset", "--local", "user.name"]);
        }
        if (globalUserEmail.value && localUserEmail.value === LocalCheckpointService.USER_EMAIL) {
            await git.raw(["config", "--unset", "--local", "user.email"]);
        }
        // Only set user config if not already configured.
        if (!userName) {
            await git.addConfig("user.name", LocalCheckpointService.USER_NAME);
        }
        if (!userEmail) {
            await git.addConfig("user.email", LocalCheckpointService.USER_EMAIL);
        }
        if (!isExistingRepo) {
            // We need at least one file to commit, otherwise the initial
            // commit will fail, unless we use the `--allow-empty` flag.
            // However, using an empty commit causes problems when restoring
            // the checkpoint (i.e. the `git restore` command doesn't work
            // for empty commits).
            await promises_1.default.writeFile(path_1.default.join(workspaceDir, ".gitkeep"), "");
            await git.add(".gitkeep");
            const commit = await git.commit("Initial commit");
            if (!commit.commit) {
                throw new Error("Failed to create initial commit");
            }
            log(`[initRepo] Initial commit: ${commit.commit}`);
        }
        const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
        const currentSha = await git.revparse(["HEAD"]);
        const hiddenBranch = `${LocalCheckpointService.CHECKPOINT_BRANCH}-${taskId}`;
        const branchSummary = await git.branch();
        if (!branchSummary.all.includes(hiddenBranch)) {
            await git.checkoutBranch(hiddenBranch, currentBranch);
            await git.checkout(currentBranch);
        }
        return { currentBranch, currentSha, hiddenBranch };
    }
}
exports.LocalCheckpointService = LocalCheckpointService;
//# sourceMappingURL=LocalCheckpointService.js.map