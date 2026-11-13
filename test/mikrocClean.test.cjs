const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { mikroCCleanTarget } = require('../out/mikrocClean');

const make = path.resolve(__dirname, '..', 'bin', 'win32', 'make.exe');

function fixture(t) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikroc clean test '));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, 'Makefile'),
        'SHELL := powershell.exe\n.SHELLFLAGS := -NoProfile -Command\n' +
        'MODULE := Demo\nSOURCES_RAW := $(wildcard *.c)\n.PHONY: clean\n' + mikroCCleanTarget);
    return dir;
}

test('clean removes generated outputs, preserves inputs, and can run twice', { skip: process.platform !== 'win32' }, t => {
    const dir = fixture(t);
    const outputs = [
        'main.cp', 'main.asm', 'main.lst', 'main.emcl', 'main.mcl', 'main.log', 'main.user.dic',
        'second.cp', 'second.emcl', 'Demo.hex', 'Demo.dbg', 'Demo.dlt', 'Demo.lst',
        'Demo.log', 'Demo.mcl', 'Demo.user.dic', 'Demo.mcp32_callertable.txt', 'bins\\Demo.hex'
    ];
    const inputs = [
        'main.c', 'second.c', 'main.h', 'Demo.mcp32', 'DEFINES.pld', 'config.json',
        'vendor.emcl', 'startup.asm', 'other.hex', 'bins\\other.hex'
    ];
    fs.mkdirSync(path.join(dir, 'bins'));
    for (const file of [...outputs, ...inputs]) {
        fs.writeFileSync(path.join(dir, file), 'fixture');
    }
    for (let i = 0; i < 2; i++) {
        const result = spawnSync(make, ['clean'], { cwd: dir, encoding: 'utf8' });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        for (const file of outputs) {
            assert.equal(fs.existsSync(path.join(dir, file)), false, file);
        }
        for (const file of inputs) {
            assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), 'fixture', file);
        }
    }
});

test('clean reports a deletion failure rather than claiming success', { skip: process.platform !== 'win32' }, t => {
    const dir = fixture(t);
    fs.writeFileSync(path.join(dir, 'main.c'), 'fixture');
    fs.writeFileSync(path.join(dir, 'main.cp'), 'locked output');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command',
        `$file = [System.IO.File]::Open('main.cp', 'Open', 'ReadWrite', 'None'); ` +
        `try { & '${make.replace(/'/g, "''")}' clean; $code = $LASTEXITCODE } ` +
        'finally { $file.Dispose() }; exit $code'
    ], { cwd: dir, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /Clean complete/);
    assert.equal(fs.readFileSync(path.join(dir, 'main.cp'), 'utf8'), 'locked output');
});
