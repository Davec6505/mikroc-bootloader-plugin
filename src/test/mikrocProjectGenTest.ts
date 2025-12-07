/**
 * Test MikroC Project Generator
 * Verifies complete MikroC project generation workflow
 */

import { generateMikroCProject, validateMikroCProjectOptions, MikroCProjectOptions } from '../generators/mikrocProjectGen';
import * as fs from 'fs';
import * as path from 'path';

async function testMikroCProjectGeneration() {
    console.log('=== MikroC Project Generator Test ===\n');
    
    // Create test settings (same as XC32 test for consistency)
    const testSettings = new Map<number, string>();
    
    // DEVCFG3
    testSettings.set(0, 'Default RMII');
    testSettings.set(1, 'Default Ethernet I/O Pins');
    testSettings.set(2, 'Allow only one reconfiguration');
    testSettings.set(3, 'Allow only one reconfiguration');
    testSettings.set(4, 'Allow only one reconfiguration');
    testSettings.set(5, 'Controlled by USB Module');
    
    // DEVCFG2 (PLL)
    testSettings.set(6, '3x Divider');
    testSettings.set(7, '5-10 MHz');
    testSettings.set(8, 'POSC (Primary Oscillator)');
    testSettings.set(9, 'PLL Multiply by 50');
    testSettings.set(10, '2x Divider');
    
    // DEVCFG1 (Oscillator)
    testSettings.set(12, 'Primary Oscillator (XT, HS, EC) with PLL');
    testSettings.set(14, 'Disabled');
    testSettings.set(15, 'Disabled');
    testSettings.set(16, 'HS mode (crystal, 10-40 MHz)');
    testSettings.set(17, 'Disabled (REFCLKO I/O pin enabled)');
    testSettings.set(18, 'Clock switching and FSCM are disabled');
    testSettings.set(22, 'WDT Disabled');
    
    // DEVCFG0 (Debug)
    testSettings.set(26, 'Debugger is disabled');
    testSettings.set(27, 'JTAG Port Enabled');
    testSettings.set(28, 'Communicate on PGEC1/PGED1');
    testSettings.set(29, 'Trace features are disabled');
    testSettings.set(30, 'Boot code and Exception code is MIPS32');
    
    // Test project options
    const options: MikroCProjectOptions = {
        projectName: 'test_mikroc_blinky',
        deviceName: 'P32MZ2048EFH100',
        outputPath: 'C:/Temp',
        settings: testSettings
    };
    
    // Validate options
    console.log('1. Validating project options...');
    const errors = validateMikroCProjectOptions(options);
    if (errors.length > 0) {
        console.error('Validation errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        return;
    }
    console.log('   ✓ Options valid\n');
    
    // Generate project
    console.log('2. Generating MikroC project...');
    try {
        await generateMikroCProject(options);
        console.log('   ✓ Project generated\n');
    } catch (error) {
        console.error('   ✗ Generation failed:', error);
        return;
    }
    
    // Verify structure
    console.log('3. Verifying project structure...');
    const projectRoot = path.join(options.outputPath, options.projectName);
    
    const expectedFiles = [
        'Makefile',
        'README.md',
        '.vscode/tasks.json',
        '.vscode/c_cpp_properties.json',
        `srcs/${options.projectName}.c`,
        `srcs/${options.projectName}.cfg`,
        `srcs/${options.projectName}.c.ini`,
        `srcs/${options.projectName}.mcp32`,
        'srcs/Makefile'
    ];
    
    const expectedDirs = [
        'bins',
        'objs',
        'other'
    ];
    
    let allFilesExist = true;
    expectedFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
            console.log(`   ✓ ${file}`);
        } else {
            console.log(`   ✗ ${file} - MISSING`);
            allFilesExist = false;
        }
    });
    
    expectedDirs.forEach(dir => {
        const dirPath = path.join(projectRoot, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`   ✓ ${dir}/`);
        } else {
            console.log(`   ✗ ${dir}/ - MISSING`);
            allFilesExist = false;
        }
    });
    
    if (!allFilesExist) {
        console.error('\n✗ Project structure incomplete');
        return;
    }
    
    console.log('\n4. Verifying file contents...');
    
    // Check .cfg contains XML with DEVCFG values
    const cfgPath = path.join(projectRoot, `srcs/${options.projectName}.cfg`);
    const cfgXml = fs.readFileSync(cfgPath, 'utf8');
    if (cfgXml.includes('MCU_DEVICE_FLAGS') && cfgXml.includes('$1FC0FFC0:$')) {
        console.log('   ✓ .cfg contains XML configuration with register values');
    } else {
        console.log('   ✗ .cfg missing proper XML format');
    }
    
    // Check main.c contains device name
    const mainPath = path.join(projectRoot, `srcs/${options.projectName}.c`);
    const mainC = fs.readFileSync(mainPath, 'utf8');
    if (mainC.includes('P32MZ2048EFH100')) {
        console.log('   ✓ main.c contains device name');
    } else {
        console.log('   ✗ main.c missing device name substitution');
    }
    
    // Check Makefile contains project name
    const makefile = fs.readFileSync(path.join(projectRoot, 'Makefile'), 'utf8');
    if (makefile.includes('test_mikroc_blinky')) {
        console.log('   ✓ Makefile contains project name');
    } else {
        console.log('   ✗ Makefile missing project name substitution');
    }
    
    // Check .mcp32 project file
    const mcp32Path = path.join(projectRoot, `srcs/${options.projectName}.mcp32`);
    const mcp32 = fs.readFileSync(mcp32Path, 'utf8');
    if (mcp32.includes('[DEVICE]') && mcp32.includes('P32MZ2048EFH100')) {
        console.log('   ✓ .mcp32 project file contains device configuration');
    } else {
        console.log('   ✗ .mcp32 missing device configuration');
    }
    
    console.log('\n5. Displaying .cfg register values...');
    console.log(cfgXml);
    
    console.log('\n=== Test Complete ===');
    console.log(`Project created at: ${projectRoot}`);
    console.log('\nTo test build (requires MikroC PRO for PIC32):');
    console.log(`  cd ${projectRoot}`);
    console.log('  make');
}

// Run test
testMikroCProjectGeneration().catch(console.error);
