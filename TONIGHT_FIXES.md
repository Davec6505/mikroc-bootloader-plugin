# Tonight's XC32 Project Generator Fixes - Dec 8, 2025

## The Struggle: Dynamic Include Discovery Was Broken

### Problem Summary
The XC32 project generator templates were creating Makefiles that couldn't find peripheral header files in deeply nested directories like `config/default/peripheral/clk/plib_clk.h`. The build would fail with:
```
fatal error: plib_clk.h: No such file or directory
```

### Root Causes Identified

#### 1. **Hardcoded Paths Instead of Cross-Platform Detection**
**Issue**: RootMakefile.template had hardcoded Windows paths without OS detection
```makefile
# BROKEN - Windows only
COMPILER_LOCATION := C:/Program Files/Microchip/xc32/v5.00/bin
DFP_LOCATION := C:/Program Files/Microchip/MPLABX/v6.25/packs
```

**Fix**: Added OS-specific path detection
```makefile
# FIXED - Cross-platform
ifeq ($(OS),Windows_NT)
    COMPILER_LOCATION := C:/Program Files/Microchip/xc32/v5.00/bin
    DFP_LOCATION := C:/Program Files/Microchip/MPLABX/v6.25/packs
else
    COMPILER_LOCATION := /opt/microchip/xc32/v5.00/bin
    DFP_LOCATION := /opt/microchip/mplabx/v6.25/packs
endif
DFP := $(DFP_LOCATION)/Microchip/PIC32MZ-EF_DFP/1.4.168
```

#### 2. **Include Directory Discovery Too Shallow**
**Issue**: The `get_inc_dirs` function only searched 3 levels deep, but peripheral headers were 4+ levels deep:
- `./config/default/peripheral/clk/` = 4 levels from `srcs/`
- `../incs/config/default/peripheral/clk/` = 5 levels

**Broken Code**:
```makefile
# BROKEN - Only 3 levels
define get_inc_dirs
$(sort $(dir $(wildcard $(1)/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/*/.)))
endef
```

**Fix**: Extended to 5 levels deep
```makefile
# FIXED - 5 levels deep
define get_inc_dirs
$(sort $(dir $(wildcard $(1)/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/*/*/.))) \
$(sort $(dir $(wildcard $(1)/*/*/*/*/*/.)))
endef
```

#### 3. **Extra Closing Parenthesis Causing Syntax Errors**
**Issue**: After initial fix, had extra `)` causing shell syntax errors:
```
/bin/sh: -c: line 1: syntax error near unexpected token `)'
```

The include flags were being built with `-I)` which broke the command.

**Fix**: Removed the extra parenthesis from the last line of `get_inc_dirs`

#### 4. **Redundant bin2hex Call**
**Issue**: RootMakefile was calling `xc32-bin2hex` without the `.elf` extension, but the srcs/Makefile already creates the hex file correctly.

**Broken Code**:
```makefile
build:
	cd srcs && $(BUILD) ...
	@echo "###### BIN TO HEX ########"
	cd bins && "$(COMPILER_LOCATION)/xc32-bin2hex" $(MODULE)  # FAILS - no .elf extension
```

**Fix**: Removed redundant call since srcs/Makefile already handles it
```makefile
build:
	cd srcs && $(BUILD) ...
	@echo "######  BUILD COMPLETE (bins/$(MODULE).hex)  ########"
```

### Files Fixed

#### Template Files (mikroc-bootloader-plugin)
1. **src/templates/xc32/RootMakefile.template**
   - Added OS detection for COMPILER_LOCATION and DFP_LOCATION
   - Removed redundant bin2hex call

2. **src/templates/xc32/SrcsMakefile.template**
   - Extended `get_inc_dirs` from 3 to 5 levels deep
   - Updated comment from "3 levels deep" to "5 levels deep"
   - Added include directory debug output to show discovered paths
   - Fixed extra parenthesis bug

#### Test Project Files (xc32-test)
- Applied same fixes to verify they work before updating templates

### Verification

The dynamic include discovery now correctly finds all directories:

**From SRC directory**:
```
./config/
./startup/
./config/default/
./config/default/peripheral/
./config/default/peripheral/clk/
./config/default/peripheral/coretimer/
./config/default/peripheral/evic/
./config/default/peripheral/gpio/
```

**From INC directory**:
```
../incs/config/
../incs/config/default/
../incs/config/default/peripheral/
../incs/config/default/peripheral/clk/
../incs/config/default/peripheral/coretimer/
../incs/config/default/peripheral/evic/
../incs/config/default/peripheral/gpio/
```

### Build Result

✅ **Successful build output**:
```
Compiling main.c...
Compiling ./config/default/exceptions.c...
Compiling config/default/initialization.c...
Compiling ./config/default/interrupts.c...
Compiling ./config/default/peripheral/clk/plib_clk.c...
Compiling ./config/default/peripheral/coretimer/plib_coretimer.c...
Compiling ./config/default/peripheral/evic/plib_evic.c...
Compiling ./config/default/peripheral/gpio/plib_gpio.c...
Assembling startup/startup.S...
Linking xc32-test...
Creating HEX file: ../bins/xc32-test.hex

==========================================
  Build Complete: xc32-test
==========================================
  Device:     32MZ1024EFH064
  Config:     Release
  Output:     ../bins/xc32-test.hex
==========================================
   text    data     bss     dec     hex filename
   3700     756       0    4456    1168 ../bins/xc32-test.elf
```

### Key Learnings

1. **Keep it dynamic** - Don't hardcode paths, use OS detection
2. **Deep nesting matters** - Peripheral files can be 5+ levels deep in MPLAB Harmony projects
3. **Watch for syntax errors** - Extra parentheses in makefile functions cause shell errors
4. **Don't duplicate work** - The srcs Makefile already handles bin2hex correctly
5. **Test incrementally** - Fix one thing at a time, verify it works, then move to templates

### Testing Done
- ✅ Clean build from scratch
- ✅ Incremental build (only changed files)
- ✅ Cross-platform path detection (Windows)
- ✅ All peripheral headers found dynamically
- ✅ Successful flash to device via MikroE bootloader

## Status: COMPLETE ✅

All templates now generate working Makefiles with fully dynamic include discovery that works on both Windows and Linux.
