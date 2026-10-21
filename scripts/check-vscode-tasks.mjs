#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * Check for dangerous VS Code task configurations.
 * Fails if any tracked .vscode/tasks.json contains "runOn": "folderOpen".
 * Reports the file path only, never executes task content.
 */
function checkVscodeTasks() {
  const taskFiles = [];
  const vscodeDir = path.join(ROOT, '.vscode');

  // Find all tracked tasks.json files (respecting .gitignore)
  // We check the working tree for any tasks.json that git would track
  function findTaskFiles(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        findTaskFiles(full);
      } else if (entry.name === 'tasks.json') {
        taskFiles.push(full);
      }
    }
  }

  findTaskFiles(ROOT);

  if (taskFiles.length === 0) {
    console.log('✓ No VS Code tasks.json files found in working tree');
    return { violations: [], checked: 0 };
  }

  console.log(`Scanning ${taskFiles.length} VS Code tasks.json file(s)...`);

  const violations = [];

  for (const file of taskFiles) {
    const relPath = path.relative(ROOT, file);
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Parse JSON to properly detect runOn: folderOpen
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.warn(`  ⚠ Could not parse ${relPath}: ${e.message}`);
        continue;
      }

      // Check tasks array for runOn: folderOpen
      const tasks = parsed.tasks || [];
      for (const task of tasks) {
        if (task.runOn === 'folderOpen') {
          violations.push({
            file: relPath,
            taskName: task.label || 'unnamed',
            detail: 'Contains "runOn": "folderOpen" which executes automatically when opening the folder'
          });
        }
      }
    } catch (e) {
      console.warn(`  ⚠ Could not read ${relPath}: ${e.message}`);
    }
  }

  if (violations.length > 0) {
    console.error('\n✗ Dangerous VS Code task configurations detected:\n');
    for (const v of violations) {
      console.error(`  File: ${v.file}`);
      console.error(`  Task: ${v.taskName}`);
      console.error(`  Issue: ${v.detail}`);
      console.error('');
    }
    console.error('These tasks execute code automatically when a contributor opens the repository.');
    console.error('Remove "runOn": "folderOpen" or move the task to a non-tracked location.');
  } else {
    console.log('✓ No dangerous "runOn: folderOpen" configurations found');
  }

  return { violations, checked: taskFiles.length };
}

const result = checkVscodeTasks();
process.exit(result.violations.length > 0 ? 1 : 0);