import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

const APP_ID = 'io.github.purpleempress.CinnyThreads';

test('desktop wrapper has an independent private-build identity', async () => {
  const config = await readJson('desktop/src-tauri/tauri.conf.json');
  const cargo = await read('desktop/src-tauri/Cargo.toml');

  assert.equal(config.productName, 'Cinny Threads');
  assert.equal(config.mainBinaryName, 'cinny-threads');
  assert.equal(config.identifier, APP_ID);
  assert.equal(config.build.frontendDist, '../dist');
  assert.match(config.build.beforeBuildCommand, /build:desktop/);
  assert.equal(config.plugins?.updater, undefined);
  assert.doesNotMatch(cargo, /tauri-plugin-updater/);
  assert.doesNotMatch(cargo, /\bupdater\b/);
});

test('desktop webview permissions exclude command execution and arbitrary filesystem access', async () => {
  const capability = await read('desktop/src-tauri/capabilities/desktop.json');
  assert.doesNotMatch(capability, /shell:allow-execute|fs:allow-|http:default|process:allow-/);
});

test('Flatpak manifest uses the private-build identity and no home filesystem escape', async () => {
  const manifest = await read('packaging/flatpak/io.github.purpleempress.CinnyThreads.yml');
  assert.match(manifest, new RegExp(`id: ${APP_ID}`));
  assert.match(manifest, /command: cinny-threads/);
  assert.match(manifest, /type: git[\s\S]*path: \.\.\/\.\.[\s\S]*branch: main/);
  assert.doesNotMatch(manifest, /--filesystem=home/);
  assert.doesNotMatch(manifest, /--share=network[^\n]*#|--filesystem=host/);
});

test('desktop CI builds and smoke-tests Windows EXE and Flatpak artifacts', async () => {
  const workflow = await read('.github/workflows/desktop-build.yml');
  assert.match(workflow, /windows-latest/);
  assert.match(workflow, /--bundles nsis/);
  assert.match(workflow, /\.exe/);
  assert.match(workflow, /flatpak-builder/);
  assert.match(workflow, /build-bundle/);
  assert.match(workflow, /npm audit --audit-level=moderate/);
  assert.match(workflow, /npm --prefix desktop audit --audit-level=moderate/);
  assert.match(workflow, /cargo audit --file desktop\/src-tauri\/Cargo\.lock/);
  assert.match(workflow, /windows-exe:[\s\S]*needs: dependency-audit/);
  assert.match(workflow, /flatpak:[\s\S]*needs: dependency-audit/);
  assert.match(workflow, /smoke/i);
  assert.doesNotMatch(workflow, /TAURI_SIGNING_PRIVATE_KEY|pull_request_target/);
});

test('dependency automation remains enabled for web, desktop, Cargo, and Actions', async () => {
  const dependabot = await read('.github/dependabot.yml');
  assert.match(dependabot, /package-ecosystem:\s*"?npm"?/);
  assert.match(dependabot, /directory:\s*"?\/desktop"?/);
  assert.match(dependabot, /package-ecosystem:\s*"?cargo"?/);
  assert.match(dependabot, /package-ecosystem:\s*"?github-actions"?/);
});
