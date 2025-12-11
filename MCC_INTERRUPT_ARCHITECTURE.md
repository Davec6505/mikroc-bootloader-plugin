# MCC Interrupt Architecture

## Overview
Microchip Code Configurator (MCC) uses a centralized interrupt routing system where all interrupt vectors are managed in `interrupts.c` and `interrupts.h`, while each peripheral library handles its own interrupt logic and user callbacks.

## Interrupt Flow

```
Hardware IRQ → ISR Vector (interrupts.c) → InterruptHandler (plib_xxx.c) → User Callback
```

### Example: Timer1 Interrupt Flow

1. **Hardware triggers Timer1 interrupt**
2. **CPU vectors to `TIMER_1_Handler` in interrupts.c**
   ```c
   void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler (void)
   {
       TIMER_1_InterruptHandler();  // Call peripheral handler
   }
   ```
3. **`TIMER_1_InterruptHandler()` in plib_tmr1.c executes**
   ```c
   void TIMER_1_InterruptHandler (void)
   {
       uint32_t status = 0U;
       status = IFS0bits.T1IF;  // Read interrupt flag
       IFS0CLR = _IFS0_T1IF_MASK;  // Clear interrupt flag
       
       if((tmr1Obj.callback_fn != NULL))
       {
           uintptr_t context = tmr1Obj.context;
           tmr1Obj.callback_fn(status, context);  // Call user callback
       }
   }
   ```
4. **User's registered callback function executes**

## File Structure

### interrupts.h
**Purpose**: Declares all peripheral interrupt handler functions

**Contents**:
- Include guards and standard includes
- **InterruptHandler** function declarations for all enabled peripherals
- These functions are implemented in their respective peripheral libraries

**Example**:
```c
#ifndef INTERRUPTS_H
#define INTERRUPTS_H

#include <stdint.h>

// *****************************************************************************
// Section: Handler Routines
// *****************************************************************************
void TIMER_1_InterruptHandler( void );
void TIMER_2_InterruptHandler( void );
void UART1_FAULT_InterruptHandler( void );
void UART1_RX_InterruptHandler( void );
// ... etc for all enabled interrupts

#endif // INTERRUPTS_H
```

### interrupts.c
**Purpose**: Central interrupt vector routing - maps hardware vectors to peripheral handlers

**Structure**:
1. **Includes**: `interrupts.h` and `definitions.h`
2. **Forward Declarations**: ISR wrapper functions
   ```c
   void TIMER_1_Handler (void);
   void TIMER_2_Handler (void);
   ```
3. **ISR Definitions**: Vector implementations using `__ISR()` attribute
   ```c
   void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler (void)
   {
       TIMER_1_InterruptHandler();
   }
   ```

**Key Points**:
- Each ISR wrapper has minimal code - just calls the peripheral's InterruptHandler
- ISR attributes specify vector number and interrupt priority level (ipl)
- Shadow register set can be auto (SRS) or manual (SOFT)
- No peripheral-specific logic in this file - keeps it modular

### plib_xxx.c (Peripheral Libraries)
**Purpose**: Implement interrupt handling logic for specific peripheral

**Contains**:
- **`TIMER_X_InterruptHandler()`**: The actual interrupt service routine
  - Reads interrupt status
  - Clears interrupt flag
  - Calls user callback if registered
- **`TMRx_InterruptEnable()`**: Enable peripheral interrupt
- **`TMRx_InterruptDisable()`**: Disable peripheral interrupt  
- **`TMRx_CallbackRegister()`**: Register user callback function
- **Timer object**: Stores callback function pointer and context

**Example** (plib_tmr1.c):
```c
static volatile TMR1_TIMER_OBJECT tmr1Obj;

void TIMER_1_InterruptHandler (void)
{
    uint32_t status = 0U;
    status = IFS0bits.T1IF;
    IFS0CLR = _IFS0_T1IF_MASK;

    if((tmr1Obj.callback_fn != NULL))
    {
        uintptr_t context = tmr1Obj.context;
        tmr1Obj.callback_fn(status, context);
    }
}

void TMR1_InterruptEnable(void)
{
    IEC0SET = _IEC0_T1IE_MASK;
}

void TMR1_InterruptDisable(void)
{
    IEC0CLR = _IEC0_T1IE_MASK;
}

void TMR1_CallbackRegister( TMR1_CALLBACK callback_fn, uintptr_t context )
{
    tmr1Obj.callback_fn = callback_fn;
    tmr1Obj.context = context;
}
```

## Benefits of This Architecture

### 1. **Modularity**
- Each peripheral manages its own interrupt logic
- Adding/removing peripherals doesn't require deep changes to interrupts.c
- Peripheral libraries are self-contained

### 2. **Maintainability**
- Clear separation of concerns
- Easy to locate interrupt code for a specific peripheral
- Central vector table in one file (interrupts.c)

### 3. **Flexibility**
- User can register/unregister callbacks at runtime
- Context pointer allows passing data to callbacks
- Each peripheral can have unique interrupt handling logic

### 4. **Code Reuse**
- Peripheral libraries can be used across different projects
- interrupts.c is generated based on enabled peripherals
- No duplicate interrupt handling code

## User Application Usage

### Registering a Callback

```c
#include "definitions.h"

// User callback function
void myTimer1Callback(uint32_t status, uintptr_t context)
{
    // Handle timer interrupt
    // Toggle LED, increment counter, etc.
}

int main(void)
{
    // Initialize system
    SYS_Initialize(NULL);
    
    // Register Timer1 callback
    TMR1_CallbackRegister(myTimer1Callback, (uintptr_t)NULL);
    
    // Start timer
    TMR1_Start();
    
    while(1)
    {
        // Main loop
    }
}
```

### Passing Context to Callback

```c
typedef struct
{
    uint32_t counter;
    bool ledState;
} APP_DATA;

APP_DATA appData = {0, false};

void myTimer1Callback(uint32_t status, uintptr_t context)
{
    APP_DATA *app = (APP_DATA*)context;
    app->counter++;
    app->ledState = !app->ledState;
}

int main(void)
{
    SYS_Initialize(NULL);
    
    // Pass context pointer
    TMR1_CallbackRegister(myTimer1Callback, (uintptr_t)&appData);
    
    TMR1_Start();
    
    while(1) { }
}
```

## Generator Implementation

### When Generating interrupts.h
1. Check which peripherals have interrupts enabled
2. Add `void PERIPHERAL_X_InterruptHandler( void );` declarations
3. Maintain alphabetical/logical order

### When Generating interrupts.c
1. Load base template
2. Add forward declarations: `void PERIPHERAL_X_Handler (void);`
3. Add ISR definitions with proper attributes:
   - Vector number: `_TIMER_1_VECTOR`, `_UART1_RX_VECTOR`, etc.
   - Priority level: `ipl1SRS`, `ipl2SOFT`, etc.
   - Call to InterruptHandler function

### When Generating plib_xxx.c
1. Create volatile peripheral object to store callback
2. Implement `PERIPHERAL_X_InterruptHandler()`:
   - Read status flag
   - Clear interrupt flag
   - Call user callback if registered
3. Implement Enable/Disable functions
4. Implement CallbackRegister function

## Important Notes

### ISR Attributes
- `__ISR(vector, ipl)` - Microchip's interrupt service routine attribute
- `vector` - Hardware vector number (e.g., `_TIMER_1_VECTOR`)
- `ipl` - Interrupt priority level:
  - `ipl1SRS` through `ipl7SRS` - Auto shadow register set selection
  - `ipl1SOFT` through `ipl7SOFT` - Manual shadow register set (for fine control)

### Volatile Keyword
- Timer objects are declared `volatile` because they're accessed from both main code and ISR
- Prevents compiler optimization issues

### Interrupt Priority
- Configured in EVIC (Event Interrupt Controller) during initialization
- IPC registers set priority (0-7) and subpriority (0-3)
- Higher number = higher priority

### Shadow Register Sets (SRS)
- PIC32 feature to speed up context switching
- Auto mode lets hardware choose optimal set
- Manual mode for advanced control (rarely needed)

## Comparison: Old vs MCC Architecture

### Traditional Approach
```c
// Everything in one interrupts.c file
void __ISR(_TIMER_1_VECTOR, ipl1AUTO) Timer1_ISR(void)
{
    IFS0CLR = _IFS0_T1IF_MASK;
    // All timer logic here
    counter++;
    LED_Toggle();
    // Hard to reuse, hard to maintain
}
```

### MCC Architecture
```c
// interrupts.c - Just routing
void __ISR(_TIMER_1_VECTOR, ipl1SRS) TIMER_1_Handler (void)
{
    TIMER_1_InterruptHandler();  // Call peripheral library
}

// plib_tmr1.c - Reusable, modular
void TIMER_1_InterruptHandler (void)
{
    uint32_t status = IFS0bits.T1IF;
    IFS0CLR = _IFS0_T1IF_MASK;
    if(tmr1Obj.callback_fn != NULL)
        tmr1Obj.callback_fn(status, tmr1Obj.context);
}

// main.c - User application
void myCallback(uint32_t status, uintptr_t context)
{
    counter++;
    LED_Toggle();
}
```

The MCC approach provides better separation of concerns and code reusability.
