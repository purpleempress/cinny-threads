import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

const APP_ID = 'io.github.purpleempress.CinnyThreads';

test('desktop wrapper has an independent fork identity', async () => {
  const config = await readJson('desktop/src-tauri/tauri.conf.json');
  const cargo = await read('desktop/src-tauri/Cargo.toml');
  const rust = await read('desktop/src-tauri/src/lib.rs');
  const desktopEntry = await read('packaging/flatpak/io.github.purpleempress.CinnyThreads.desktop');
  const appstream = await read(
    'packaging/flatpak/io.github.purpleempress.CinnyThreads.metainfo.xml'
  );

  assert.equal(config.productName, 'Cinny');
  assert.equal(config.mainBinaryName, 'cinny-threads');
  assert.equal(config.identifier, APP_ID);
  assert.equal(config.build.frontendDist, '../dist');
  assert.match(config.build.beforeBuildCommand, /build:desktop/);
  assert.match(rust, /\.title\("Cinny"\)/);
  assert.match(desktopEntry, /^Name=Cinny$/m);
  assert.match(appstream, /<name>Cinny<\/name>/);
  assert.equal(config.plugins?.updater, undefined);
  assert.doesNotMatch(cargo, /tauri-plugin-updater/);
  assert.doesNotMatch(cargo, /\bupdater\b/);
});

test('desktop release metadata uses the current fork version', async () => {
  const config = await readJson('desktop/src-tauri/tauri.conf.json');
  const desktopPackage = await readJson('desktop/package.json');
  const appstream = await read(
    'packaging/flatpak/io.github.purpleempress.CinnyThreads.metainfo.xml'
  );

  assert.equal(config.version, '4.12.6-threads.5');
  assert.equal(desktopPackage.version, '4.12.6-threads.5');
  assert.match(appstream, /<release version="4\.12\.6-threads\.5"/);
});

test('desktop captures external link clicks and routes them through native navigation policy', async () => {
  const desktopCapability = await readJson('desktop/src-tauri/capabilities/desktop.json');
  const rust = await read('desktop/src-tauri/src/lib.rs');
  const clickBridge = await read('desktop/src-tauri/src/external_links.js');

  assert.match(rust, /open_js_links_on_click\(false\)/);
  assert.match(rust, /\.on_page_load\(/);
  assert.match(rust, /\.eval\(include_str!\("external_links\.js"\)\)/);
  assert.match(rust, /is_allowed_external_url/);
  assert.match(rust, /\.on_navigation\(/);
  assert.match(clickBridge, /__CINNY_EXTERNAL_LINK_CAPTURE_INSTALLED__/);
  assert.match(clickBridge, /addEventListener\('click',[\s\S]*true\)/);
  assert.match(clickBridge, /event\.preventDefault\(\)/);
  assert.match(clickBridge, /window\.location\.assign\(url\.href\)/);
  assert.doesNotMatch(clickBridge, /__TAURI_INTERNALS__|plugin:opener/);
  assert.deepEqual(desktopCapability.permissions, ['core:default']);
  assert.doesNotMatch(
    JSON.stringify(desktopCapability),
    /shell:allow-execute|fs:allow-|http:default|process:allow-|opener:/
  );
});

test('Flatpak manifest uses the fork identity and no home filesystem escape', async () => {
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
