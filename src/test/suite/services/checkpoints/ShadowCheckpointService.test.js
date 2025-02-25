import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { simpleGit } from 'simple-git';
import { ShadowCheckpointService } from '../../../../services/checkpoints/ShadowCheckpointService';
import { CheckpointServiceFactory } from '../../../../services/checkpoints/CheckpointServiceFactory';
// Mock globby module
const mockGlobby = {
    globby: async () => []
};
require('globby');
jest.mock('globby', () => mockGlobby);
suite('ShadowCheckpointService', () => {
    const taskId = 'test-task';
    let workspaceGit;
    let shadowGit;
    let testFile;
    let service;
    const initRepo = async ({ workspaceDir, userName = 'Roo Code', userEmail = 'support@roocode.com', testFileName = 'test.txt', textFileContent = 'Hello, world!' }) => {
        // Create a temporary directory for testing
        await fs.mkdir(workspaceDir);
        // Initialize git repo
        const git = simpleGit(workspaceDir);
        await git.init();
        await git.addConfig('user.name', userName);
        await git.addConfig('user.email', userEmail);
        // Create test file
        const testFile = path.join(workspaceDir, testFileName);
        await fs.writeFile(testFile, textFileContent);
        // Create initial commit
        await git.add('.');
        await git.commit('Initial commit');
        return { git, testFile };
    };
    setup(async () => {
        // Reset globby mock
        mockGlobby.globby = async () => [];
        const shadowDir = path.join(os.tmpdir(), `shadow-${Date.now()}`);
        const workspaceDir = path.join(os.tmpdir(), `workspace-${Date.now()}`);
        const repo = await initRepo({ workspaceDir });
        testFile = repo.testFile;
        service = await CheckpointServiceFactory.create({
            strategy: 'shadow',
            options: { taskId, shadowDir, workspaceDir, log: () => { } }
        });
        workspaceGit = repo.git;
        shadowGit = service.git;
    });
    teardown(async () => {
        await fs.rm(service.shadowDir, { recursive: true, force: true });
        await fs.rm(service.workspaceDir, { recursive: true, force: true });
    });
    suite('getDiff', () => {
        test('returns the correct diff between commits', async () => {
            await fs.writeFile(testFile, 'Ahoy, world!');
            const commit1 = await service.saveCheckpoint('First checkpoint');
            assert.ok(commit1?.commit, 'First commit should be created');
            await fs.writeFile(testFile, 'Goodbye, world!');
            const commit2 = await service.saveCheckpoint('Second checkpoint');
            assert.ok(commit2?.commit, 'Second commit should be created');
            const diff1 = await service.getDiff({ to: commit1.commit });
            assert.strictEqual(diff1.length, 1, 'Should have one diff');
            assert.strictEqual(diff1[0].paths.relative, 'test.txt');
            assert.strictEqual(diff1[0].paths.absolute, testFile);
            assert.strictEqual(diff1[0].content.before, 'Hello, world!');
            assert.strictEqual(diff1[0].content.after, 'Ahoy, world!');
            const diff2 = await service.getDiff({ to: commit2.commit });
            assert.strictEqual(diff2.length, 1, 'Should have one diff');
            assert.strictEqual(diff2[0].paths.relative, 'test.txt');
            assert.strictEqual(diff2[0].paths.absolute, testFile);
            assert.strictEqual(diff2[0].content.before, 'Hello, world!');
            assert.strictEqual(diff2[0].content.after, 'Goodbye, world!');
            const diff12 = await service.getDiff({ from: commit1.commit, to: commit2.commit });
            assert.strictEqual(diff12.length, 1, 'Should have one diff');
            assert.strictEqual(diff12[0].paths.relative, 'test.txt');
            assert.strictEqual(diff12[0].paths.absolute, testFile);
            assert.strictEqual(diff12[0].content.before, 'Ahoy, world!');
            assert.strictEqual(diff12[0].content.after, 'Goodbye, world!');
        });
        test('handles new files in diff', async () => {
            const newFile = path.join(service.workspaceDir, 'new.txt');
            await fs.writeFile(newFile, 'New file content');
            const commit = await service.saveCheckpoint('Add new file');
            assert.ok(commit?.commit, 'Commit should be created');
            const changes = await service.getDiff({ to: commit.commit });
            const change = changes.find(c => c.paths.relative === 'new.txt');
            assert.ok(change, 'New file change should exist');
            assert.strictEqual(change?.content.before, '');
            assert.strictEqual(change?.content.after, 'New file content');
        });
        test('handles deleted files in diff', async () => {
            const fileToDelete = path.join(service.workspaceDir, 'new.txt');
            await fs.writeFile(fileToDelete, 'New file content');
            const commit1 = await service.saveCheckpoint('Add file');
            assert.ok(commit1?.commit, 'First commit should be created');
            await fs.unlink(fileToDelete);
            const commit2 = await service.saveCheckpoint('Delete file');
            assert.ok(commit2?.commit, 'Second commit should be created');
            const changes = await service.getDiff({ from: commit1.commit, to: commit2.commit });
            const change = changes.find(c => c.paths.relative === 'new.txt');
            assert.ok(change, 'Deleted file change should exist');
            assert.strictEqual(change.content.before, 'New file content');
            assert.strictEqual(change.content.after, '');
        });
    });
    suite('saveCheckpoint', () => {
        test('creates a checkpoint if there are pending changes', async () => {
            await fs.writeFile(testFile, 'Ahoy, world!');
            const commit1 = await service.saveCheckpoint('First checkpoint');
            assert.ok(commit1?.commit, 'First commit should be created');
            const details1 = await service.getDiff({ to: commit1.commit });
            assert.ok(details1[0].content.before.includes('Hello, world!'), 'Should contain old content');
            assert.ok(details1[0].content.after.includes('Ahoy, world!'), 'Should contain new content');
            await fs.writeFile(testFile, 'Hola, world!');
            const commit2 = await service.saveCheckpoint('Second checkpoint');
            assert.ok(commit2?.commit, 'Second commit should be created');
            const details2 = await service.getDiff({ from: commit1.commit, to: commit2.commit });
            assert.ok(details2[0].content.before.includes('Ahoy, world!'), 'Should contain old content');
            assert.ok(details2[0].content.after.includes('Hola, world!'), 'Should contain new content');
            // Switch to checkpoint 1
            await service.restoreCheckpoint(commit1.commit);
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'Ahoy, world!', 'Should restore first checkpoint');
            // Switch to checkpoint 2
            await service.restoreCheckpoint(commit2.commit);
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'Hola, world!', 'Should restore second checkpoint');
            // Switch back to initial commit
            assert.ok(service.baseHash, 'Base hash should exist');
            await service.restoreCheckpoint(service.baseHash);
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'Hello, world!', 'Should restore initial commit');
        });
        test('preserves workspace and index state after saving checkpoint', async () => {
            // Create three files with different states: staged, unstaged, and mixed
            const unstagedFile = path.join(service.workspaceDir, 'unstaged.txt');
            const stagedFile = path.join(service.workspaceDir, 'staged.txt');
            const mixedFile = path.join(service.workspaceDir, 'mixed.txt');
            await fs.writeFile(unstagedFile, 'Initial unstaged');
            await fs.writeFile(stagedFile, 'Initial staged');
            await fs.writeFile(mixedFile, 'Initial mixed');
            await workspaceGit.add(['.']);
            const result = await workspaceGit.commit('Add initial files');
            assert.ok(result?.commit, 'Initial commit should be created');
            await fs.writeFile(unstagedFile, 'Modified unstaged');
            await fs.writeFile(stagedFile, 'Modified staged');
            await workspaceGit.add([stagedFile]);
            await fs.writeFile(mixedFile, 'Modified mixed - staged');
            await workspaceGit.add([mixedFile]);
            await fs.writeFile(mixedFile, 'Modified mixed - unstaged');
            // Save checkpoint
            const commit = await service.saveCheckpoint('Test checkpoint');
            assert.ok(commit?.commit, 'Commit should be created');
            // Verify workspace state is preserved
            const status = await workspaceGit.status();
            // All files should be modified
            assert.ok(status.modified.includes('unstaged.txt'), 'Unstaged file should be modified');
            assert.ok(status.modified.includes('staged.txt'), 'Staged file should be modified');
            assert.ok(status.modified.includes('mixed.txt'), 'Mixed file should be modified');
            // Only staged and mixed files should be staged
            assert.ok(!status.staged.includes('unstaged.txt'), 'Unstaged file should not be staged');
            assert.ok(status.staged.includes('staged.txt'), 'Staged file should be staged');
            assert.ok(status.staged.includes('mixed.txt'), 'Mixed file should be staged');
            // Verify file contents
            assert.strictEqual(await fs.readFile(unstagedFile, 'utf-8'), 'Modified unstaged', 'Unstaged file content should match');
            assert.strictEqual(await fs.readFile(stagedFile, 'utf-8'), 'Modified staged', 'Staged file content should match');
            assert.strictEqual(await fs.readFile(mixedFile, 'utf-8'), 'Modified mixed - unstaged', 'Mixed file content should match');
            // Verify staged changes (--cached shows only staged changes)
            const stagedDiff = await workspaceGit.diff(['--cached', 'mixed.txt']);
            assert.ok(stagedDiff.includes('-Initial mixed'), 'Should show old content');
            assert.ok(stagedDiff.includes('+Modified mixed - staged'), 'Should show staged content');
            // Verify unstaged changes (shows working directory changes)
            const unstagedDiff = await workspaceGit.diff(['mixed.txt']);
            assert.ok(unstagedDiff.includes('-Modified mixed - staged'), 'Should show staged content');
            assert.ok(unstagedDiff.includes('+Modified mixed - unstaged'), 'Should show unstaged content');
        });
        test('does not create a checkpoint if there are no pending changes', async () => {
            const commit0 = await service.saveCheckpoint('Zeroth checkpoint');
            assert.ok(!commit0?.commit, 'Should not create commit without changes');
            await fs.writeFile(testFile, 'Ahoy, world!');
            const commit1 = await service.saveCheckpoint('First checkpoint');
            assert.ok(commit1?.commit, 'Should create commit with changes');
            const commit2 = await service.saveCheckpoint('Second checkpoint');
            assert.ok(!commit2?.commit, 'Should not create commit without changes');
        });
        test('includes untracked files in checkpoints', async () => {
            // Create an untracked file
            const untrackedFile = path.join(service.workspaceDir, 'untracked.txt');
            await fs.writeFile(untrackedFile, 'I am untracked!');
            // Save a checkpoint with the untracked file
            const commit1 = await service.saveCheckpoint('Checkpoint with untracked file');
            assert.ok(commit1?.commit, 'Should create commit');
            // Verify the untracked file was included in the checkpoint
            const details = await service.getDiff({ to: commit1.commit });
            assert.ok(details[0].content.before.includes(''), 'Should show empty before content');
            assert.ok(details[0].content.after.includes('I am untracked!'), 'Should show new content');
            // Create another checkpoint with a different state
            await fs.writeFile(testFile, 'Changed tracked file');
            const commit2 = await service.saveCheckpoint('Second checkpoint');
            assert.ok(commit2?.commit, 'Should create second commit');
            // Restore first checkpoint and verify untracked file is preserved
            await service.restoreCheckpoint(commit1.commit);
            assert.strictEqual(await fs.readFile(untrackedFile, 'utf-8'), 'I am untracked!', 'Should preserve untracked file');
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'Hello, world!', 'Should restore tracked file');
            // Restore second checkpoint and verify untracked file remains
            await service.restoreCheckpoint(commit2.commit);
            assert.strictEqual(await fs.readFile(untrackedFile, 'utf-8'), 'I am untracked!', 'Should preserve untracked file');
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'Changed tracked file', 'Should restore tracked file');
        });
        test('handles file deletions correctly', async () => {
            await fs.writeFile(testFile, 'I am tracked!');
            const untrackedFile = path.join(service.workspaceDir, 'new.txt');
            await fs.writeFile(untrackedFile, 'I am untracked!');
            const commit1 = await service.saveCheckpoint('First checkpoint');
            assert.ok(commit1?.commit, 'Should create first commit');
            await fs.unlink(testFile);
            await fs.unlink(untrackedFile);
            const commit2 = await service.saveCheckpoint('Second checkpoint');
            assert.ok(commit2?.commit, 'Should create second commit');
            // Verify files are gone
            await assert.rejects(() => fs.readFile(testFile, 'utf-8'), 'Tracked file should be gone');
            await assert.rejects(() => fs.readFile(untrackedFile, 'utf-8'), 'Untracked file should be gone');
            // Restore first checkpoint
            await service.restoreCheckpoint(commit1.commit);
            assert.strictEqual(await fs.readFile(testFile, 'utf-8'), 'I am tracked!', 'Should restore tracked file');
            assert.strictEqual(await fs.readFile(untrackedFile, 'utf-8'), 'I am untracked!', 'Should restore untracked file');
            // Restore second checkpoint
            await service.restoreCheckpoint(commit2.commit);
            await assert.rejects(() => fs.readFile(testFile, 'utf-8'), 'Tracked file should be gone');
            await assert.rejects(() => fs.readFile(untrackedFile, 'utf-8'), 'Untracked file should be gone');
        });
    });
    suite('create', () => {
        test('initializes a git repository if one does not already exist', async () => {
            const shadowDir = path.join(os.tmpdir(), `shadow2-${Date.now()}`);
            const workspaceDir = path.join(os.tmpdir(), `workspace2-${Date.now()}`);
            await fs.mkdir(workspaceDir);
            const newTestFile = path.join(workspaceDir, 'test.txt');
            await fs.writeFile(newTestFile, 'Hello, world!');
            assert.strictEqual(await fs.readFile(newTestFile, 'utf-8'), 'Hello, world!', 'Initial file content should match');
            // Ensure the git repository was initialized
            const gitDir = path.join(shadowDir, 'tasks', taskId, 'checkpoints', '.git');
            await assert.rejects(() => fs.stat(gitDir), 'Git directory should not exist yet');
            const newService = await ShadowCheckpointService.create({ taskId, shadowDir, workspaceDir, log: () => { } });
            assert.ok(await fs.stat(gitDir), 'Git directory should exist');
            // Save a new checkpoint: Ahoy, world!
            await fs.writeFile(newTestFile, 'Ahoy, world!');
            const commit1 = await newService.saveCheckpoint('Ahoy, world!');
            assert.ok(commit1?.commit, 'Should create commit');
            assert.strictEqual(await fs.readFile(newTestFile, 'utf-8'), 'Ahoy, world!', 'File content should be updated');
            // Restore "Hello, world!"
            await newService.restoreCheckpoint(newService.baseHash);
            assert.strictEqual(await fs.readFile(newTestFile, 'utf-8'), 'Hello, world!', 'Should restore initial content');
            // Restore "Ahoy, world!"
            await newService.restoreCheckpoint(commit1.commit);
            assert.strictEqual(await fs.readFile(newTestFile, 'utf-8'), 'Ahoy, world!', 'Should restore updated content');
            await fs.rm(newService.shadowDir, { recursive: true, force: true });
            await fs.rm(newService.workspaceDir, { recursive: true, force: true });
        });
    });
});
//# sourceMappingURL=ShadowCheckpointService.test.js.map