import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SystemInfoTool } from '../src/tools/builtin/system.info.js';
import { TimeNowTool } from '../src/tools/builtin/time.now.js';
import { FileListTool } from '../src/tools/builtin/filesystem.list.js';
import { FileReadTool } from '../src/tools/builtin/filesystem.read.js';
import { FileWriteTool } from '../src/tools/builtin/filesystem.write.js';
import { OllamaModelsTool } from '../src/tools/builtin/ollama.models.js';
import { TerminalExecuteTool } from '../src/tools/builtin/terminal.execute.js';
import { ToolExecutionContext } from '../src/tools/interfaces/execution.types.js';

describe('Built-in Safe Tools Subsystem', () => {
  const workspaceRoot = path.resolve(process.cwd());

  const context: ToolExecutionContext = {
    requestId: 'req_tools_test',
    userId: 'ROOT_RUSHIKESH',
    environment: 'test',
    workspaceRoot
  };

  test('system.info should return valid host hardware and OS metrics', async () => {
    const tool = new SystemInfoTool();
    const res = await tool.execute({}, context);

    assert.equal(res.success, true);
    assert.ok(res.output);
    assert.ok(res.output?.os);
    assert.ok(res.output?.cpu.cores > 0);
    assert.ok(res.output?.memory.totalGb > 0);
    assert.ok(res.output?.runtime.node.startsWith('v'));
  });

  test('time.now should return valid system timestamps and timezone', async () => {
    const tool = new TimeNowTool();
    const res = await tool.execute({}, context);

    assert.equal(res.success, true);
    assert.ok(res.output);
    assert.ok(res.output?.iso);
    assert.ok(res.output?.unixMs > 0);
    assert.ok(res.output?.timezone);
  });

  test('filesystem.list should list directory contents safely in workspace', async () => {
    const tool = new FileListTool();
    const res = await tool.execute({ path: '.' }, context);

    assert.equal(res.success, true);
    assert.ok(res.output);
    assert.ok(res.output?.totalEntries > 0);
    const names = res.output?.entries.map((e) => e.name);
    assert.ok(names?.includes('package.json'));
    assert.ok(names?.includes('src'));
  });

  test('filesystem.write and filesystem.read should write and read files within workspace', async () => {
    const writeTool = new FileWriteTool();
    const readTool = new FileReadTool();
    const testRelPath = 'data/test_scratch.txt';
    const testContent = 'HṚṢĪKEŚA persistence and tool bus verification content.';

    // Write file
    const writeRes = await writeTool.execute({
      path: testRelPath,
      content: testContent,
      overwrite: true
    }, context);

    assert.equal(writeRes.success, true);
    assert.ok(writeRes.output?.bytesWritten > 0);

    // Read file
    const readRes = await readTool.execute({ path: testRelPath }, context);
    assert.equal(readRes.success, true);
    assert.equal(readRes.output?.content, testContent);

    // Clean up test file
    await fs.unlink(path.resolve(workspaceRoot, testRelPath)).catch(() => {});
  });

  test('ollama.models should discover local models from Ollama daemon', async () => {
    const tool = new OllamaModelsTool();
    const res = await tool.execute({}, context);

    assert.equal(res.success, true);
    assert.ok(res.output);
    assert.ok(res.output?.totalModels >= 1);
    const modelNames = res.output?.models.map((m) => m.name);
    assert.ok(modelNames?.some((n) => n.includes('qwen2.5')));
  });

  test('terminal.execute should allow whitelisted diagnostic commands and block arbitrary execution', async () => {
    const tool = new TerminalExecuteTool();

    // Whitelisted command
    const safeRes = await tool.execute({ command: 'node --version' }, context);
    assert.equal(safeRes.success, true);
    assert.ok(safeRes.output?.stdout.startsWith('v'));

    // Non-whitelisted command (blocked per Phase 4 security baseline)
    const blockedRes = await tool.execute({ command: 'rmdir /s /q test_dir' }, context);
    assert.equal(blockedRes.success, false);
    assert.ok(blockedRes.error?.includes('Arbitrary terminal execution is disabled in Phase 4'));
  });
});
