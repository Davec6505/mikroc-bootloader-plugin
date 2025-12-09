/**
 * Harmony Timer Code Generator
 * Generates MCC-style plib_tmrX.h/c files for PIC32MZ timers
 * 
 * Timer Types:
 * - Type A: Timer1 (16-bit only, prescaler 1,8,64,256)
 * - Type B: Timer2-9 (16-bit or 32-bit paired, prescaler 1,2,4,8,16,32,64,256)
 */

/**
 * Timer Configuration
 */
export interface TimerConfiguration {
    timer: string;          // '1', '2', '3', ... or '23', '45', '67', '89' for 32-bit mode
    prescaler: number;      // 1, 2, 4, 8, 16, 32, 64, or 256
    prValue: number;        // Period register value (PR1-PR9)
    priority: number;       // Interrupt priority (1-7)
    subPriority: number;    // Interrupt sub-priority (0-3)
    period: number;         // Actual period in seconds
    mode32Bit?: boolean;    // True if 32-bit paired mode (Timer2-9 only)
}

/**
 * Generate plib_tmr1.h (Timer1 Type A - 16-bit only)
 */
export function generateTimer1Header(): string {
    return `/*******************************************************************************
  Timer1 Peripheral Library Interface Header File

  Company
    Mikroelektronika d.o.o.

  File Name
    plib_tmr1.h

  Summary
    Timer1 peripheral library interface.

  Description
    This file defines the interface to the Timer1 peripheral library. This
    library provides access to and control of the associated peripheral
    instance.

*******************************************************************************/

// DOM-IGNORE-BEGIN
/*******************************************************************************
* Copyright (C) 2019 Microchip Technology Inc. and its subsidiaries.
*
* Subject to your compliance with these terms, you may use Microchip software
* and any derivatives exclusively with Microchip products. It is your
* responsibility to comply with third party license terms applicable to your
* use of third party software (including open source software) that may
* accompany Microchip software.
*
* THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
* EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
* WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
* PARTICULAR PURPOSE.
*
* IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
* INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
* WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
* BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
* FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN
* ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
* THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
*******************************************************************************/
// DOM-IGNORE-END

#ifndef PLIB_TMR1_H
#define PLIB_TMR1_H

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include "device.h"

// DOM-IGNORE-BEGIN
#ifdef __cplusplus  // Provide C++ Compatibility

    extern "C" {

#endif
// DOM-IGNORE-END

// *****************************************************************************
// *****************************************************************************
// Section: Data Types
// *****************************************************************************
// *****************************************************************************

typedef void (*TMR1_CALLBACK)(uint32_t status, uintptr_t context);

typedef struct
{
    TMR1_CALLBACK callback;
    uintptr_t context;
} TMR1_OBJECT;

// *****************************************************************************
// *****************************************************************************
// Section: Interface Routines
// *****************************************************************************
// *****************************************************************************

void TMR1_Initialize(void);

void TMR1_Start(void);

void TMR1_Stop(void);

void TMR1_PeriodSet(uint16_t period);

uint16_t TMR1_PeriodGet(void);

uint16_t TMR1_CounterGet(void);

void TMR1_CounterSet(uint16_t count);

uint32_t TMR1_FrequencyGet(void);

void TMR1_CallbackRegister(TMR1_CALLBACK callback, uintptr_t context);

// DOM-IGNORE-BEGIN
#ifdef __cplusplus  // Provide C++ Compatibility

    }

#endif
// DOM-IGNORE-END

#endif // PLIB_TMR1_H
`;
}

/**
 * Generate plib_tmr1.c (Timer1 Type A - 16-bit only)
 */
export function generateTimer1Source(config: TimerConfiguration): string {
    const { prescaler, prValue, priority, subPriority } = config;
    
    // Map prescaler to TCKPS bits for Type A (Timer1)
    const prescalerMap: { [key: number]: number } = {
        1: 0,   // 0b00
        8: 1,   // 0b01
        64: 2,  // 0b10
        256: 3  // 0b11
    };
    const tckps = prescalerMap[prescaler] || 0;
    
    return `/*******************************************************************************
  Timer1 Peripheral Library Interface Source File

  Company
    Mikroelektronika d.o.o.

  File Name
    plib_tmr1.c

  Summary
    Timer1 peripheral library source file.

  Description
    This file implements the interface to the Timer1 peripheral library. This
    library provides access to and control of the associated peripheral
    instance.

*******************************************************************************/

// DOM-IGNORE-BEGIN
/*******************************************************************************
* Copyright (C) 2019 Microchip Technology Inc. and its subsidiaries.
*
* Subject to your compliance with these terms, you may use Microchip software
* and any derivatives exclusively with Microchip products. It is your
* responsibility to comply with third party license terms applicable to your
* use of third party software (including open source software) that may
* accompany Microchip software.
*
* THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
* EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
* WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
* PARTICULAR PURPOSE.
*
* IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
* INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
* WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
* BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
* FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN
* ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
* THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
*******************************************************************************/
// DOM-IGNORE-END

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************

#include "device.h"
#include "plib_tmr1.h"
#include "interrupts.h"

// *****************************************************************************
// *****************************************************************************
// Section: Global Data
// *****************************************************************************
// *****************************************************************************

static TMR1_OBJECT tmr1Obj;

// *****************************************************************************
// *****************************************************************************
// Section: TMR1 Implementation
// *****************************************************************************
// *****************************************************************************

void TMR1_Initialize(void)
{
    /* Disable Timer */
    T1CONCLR = _T1CON_ON_MASK;

    /* Clear counter */
    TMR1 = 0x0;

    /* TCKPS = ${tckps} (1:${prescaler}) */
    T1CON = 0x${tckps << 4}U;

    /* Set period */
    PR1 = ${prValue}U;

    /* Clear interrupt flag */
    IFS0CLR = _IFS0_T1IF_MASK;

    /* Enable Timer interrupt */
    IEC0SET = _IEC0_T1IE_MASK;
}

void TMR1_Start(void)
{
    T1CONSET = _T1CON_ON_MASK;
}

void TMR1_Stop(void)
{
    T1CONCLR = _T1CON_ON_MASK;
}

void TMR1_PeriodSet(uint16_t period)
{
    PR1 = period;
}

uint16_t TMR1_PeriodGet(void)
{
    return (uint16_t)PR1;
}

uint16_t TMR1_CounterGet(void)
{
    return (uint16_t)TMR1;
}

void TMR1_CounterSet(uint16_t count)
{
    TMR1 = count;
}

uint32_t TMR1_FrequencyGet(void)
{
    /* Return PBCLK3 frequency divided by prescaler */
    /* Note: Actual frequency depends on system configuration */
    return (SYS_CLK_FREQ / ${prescaler}U);
}

void TMR1_CallbackRegister(TMR1_CALLBACK callback, uintptr_t context)
{
    tmr1Obj.callback = callback;
    tmr1Obj.context = context;
}

void __attribute__((used)) TIMER_1_InterruptHandler(void)
{
    uint32_t status = IFS0bits.T1IF;
    
    /* Clear interrupt flag */
    IFS0CLR = _IFS0_T1IF_MASK;

    if (tmr1Obj.callback != NULL)
    {
        uintptr_t context = tmr1Obj.context;
        tmr1Obj.callback(status, context);
    }
}
`;
}

/**
 * Generate plib_tmr2.h through plib_tmr9.h (Type B timers)
 */
export function generateTimerTypeB_Header(timerNum: number): string {
    return `/*******************************************************************************
  Timer${timerNum} Peripheral Library Interface Header File

  Company
    Mikroelektronika d.o.o.

  File Name
    plib_tmr${timerNum}.h

  Summary
    Timer${timerNum} peripheral library interface.

  Description
    This file defines the interface to the Timer${timerNum} peripheral library. This
    library provides access to and control of the associated peripheral
    instance.

*******************************************************************************/

// DOM-IGNORE-BEGIN
/*******************************************************************************
* Copyright (C) 2019 Microchip Technology Inc. and its subsidiaries.
*
* Subject to your compliance with these terms, you may use Microchip software
* and any derivatives exclusively with Microchip products. It is your
* responsibility to comply with third party license terms applicable to your
* use of third party software (including open source software) that may
* accompany Microchip software.
*
* THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
* EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
* WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
* PARTICULAR PURPOSE.
*
* IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
* INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
* WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
* BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
* FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN
* ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
* THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
*******************************************************************************/
// DOM-IGNORE-END

#ifndef PLIB_TMR${timerNum}_H
#define PLIB_TMR${timerNum}_H

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************

#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>
#include "device.h"

// DOM-IGNORE-BEGIN
#ifdef __cplusplus  // Provide C++ Compatibility

    extern "C" {

#endif
// DOM-IGNORE-END

// *****************************************************************************
// *****************************************************************************
// Section: Data Types
// *****************************************************************************
// *****************************************************************************

typedef void (*TMR${timerNum}_CALLBACK)(uint32_t status, uintptr_t context);

typedef struct
{
    TMR${timerNum}_CALLBACK callback;
    uintptr_t context;
} TMR${timerNum}_OBJECT;

// *****************************************************************************
// *****************************************************************************
// Section: Interface Routines
// *****************************************************************************
// *****************************************************************************

void TMR${timerNum}_Initialize(void);

void TMR${timerNum}_Start(void);

void TMR${timerNum}_Stop(void);

void TMR${timerNum}_PeriodSet(uint32_t period);

uint32_t TMR${timerNum}_PeriodGet(void);

uint32_t TMR${timerNum}_CounterGet(void);

void TMR${timerNum}_CounterSet(uint32_t count);

uint32_t TMR${timerNum}_FrequencyGet(void);

void TMR${timerNum}_CallbackRegister(TMR${timerNum}_CALLBACK callback, uintptr_t context);

// DOM-IGNORE-BEGIN
#ifdef __cplusplus  // Provide C++ Compatibility

    }

#endif
// DOM-IGNORE-END

#endif // PLIB_TMR${timerNum}_H
`;
}

/**
 * Generate plib_tmr2.c through plib_tmr9.c (Type B timers)
 */
export function generateTimerTypeB_Source(config: TimerConfiguration): string {
    const { timer, prescaler, prValue, priority, subPriority } = config;
    const is32Bit = timer.length === 2;
    const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
    const t32Bit = is32Bit ? 1 : 0;
    
    // Map prescaler to TCKPS bits for Type B (Timer2-9)
    const prescalerMap: { [key: number]: number } = {
        1: 0,   // 0b000
        2: 1,   // 0b001
        4: 2,   // 0b010
        8: 3,   // 0b011
        16: 4,  // 0b100
        32: 5,  // 0b101
        64: 6,  // 0b110
        256: 7  // 0b111
    };
    const tckps = prescalerMap[prescaler] || 0;
    
    // Calculate TCON value: TCKPS bits at position 4-6, T32 bit at position 3
    const tconValue = (tckps << 4) | (t32Bit << 3);
    
    const timerType = is32Bit ? 'uint32_t' : 'uint32_t'; // Always use 32-bit for flexibility
    
    return `/*******************************************************************************
  Timer${timerNum} Peripheral Library Interface Source File

  Company
    Mikroelektronika d.o.o.

  File Name
    plib_tmr${timerNum}.c

  Summary
    Timer${timerNum} peripheral library source file.

  Description
    This file implements the interface to the Timer${timerNum} peripheral library. This
    library provides access to and control of the associated peripheral
    instance.

*******************************************************************************/

// DOM-IGNORE-BEGIN
/*******************************************************************************
* Copyright (C) 2019 Microchip Technology Inc. and its subsidiaries.
*
* Subject to your compliance with these terms, you may use Microchip software
* and any derivatives exclusively with Microchip products. It is your
* responsibility to comply with third party license terms applicable to your
* use of third party software (including open source software) that may
* accompany Microchip software.
*
* THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
* EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
* WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
* PARTICULAR PURPOSE.
*
* IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
* INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
* WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
* BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
* FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL CLAIMS IN
* ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
* THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
*******************************************************************************/
// DOM-IGNORE-END

// *****************************************************************************
// *****************************************************************************
// Section: Included Files
// *****************************************************************************
// *****************************************************************************

#include "device.h"
#include "plib_tmr${timerNum}.h"
#include "interrupts.h"

// *****************************************************************************
// *****************************************************************************
// Section: Global Data
// *****************************************************************************
// *****************************************************************************

static TMR${timerNum}_OBJECT tmr${timerNum}Obj;

// *****************************************************************************
// *****************************************************************************
// Section: TMR${timerNum} Implementation
// *****************************************************************************
// *****************************************************************************

void TMR${timerNum}_Initialize(void)
{
    /* Disable Timer */
    T${timerNum}CONCLR = _T${timerNum}CON_ON_MASK;

    /* Clear counter */
    TMR${timerNum} = 0x0;

    /* TCKPS = ${tckps} (1:${prescaler})${is32Bit ? ', T32 = 1 (32-bit mode)' : ''} */
    T${timerNum}CON = 0x${tconValue.toString(16).toUpperCase()}U;

    /* Set period */
    PR${timerNum} = ${prValue}U;

    /* Clear interrupt flag */
    IFS0CLR = _IFS0_T${timerNum}IF_MASK;

    /* Enable Timer interrupt */
    IEC0SET = _IEC0_T${timerNum}IE_MASK;
}

void TMR${timerNum}_Start(void)
{
    T${timerNum}CONSET = _T${timerNum}CON_ON_MASK;
}

void TMR${timerNum}_Stop(void)
{
    T${timerNum}CONCLR = _T${timerNum}CON_ON_MASK;
}

void TMR${timerNum}_PeriodSet(${timerType} period)
{
    PR${timerNum} = period;
}

${timerType} TMR${timerNum}_PeriodGet(void)
{
    return (${timerType})PR${timerNum};
}

${timerType} TMR${timerNum}_CounterGet(void)
{
    return (${timerType})TMR${timerNum};
}

void TMR${timerNum}_CounterSet(${timerType} count)
{
    TMR${timerNum} = count;
}

uint32_t TMR${timerNum}_FrequencyGet(void)
{
    /* Return PBCLK3 frequency divided by prescaler */
    /* Note: Actual frequency depends on system configuration */
    return (SYS_CLK_FREQ / ${prescaler}U);
}

void TMR${timerNum}_CallbackRegister(TMR${timerNum}_CALLBACK callback, uintptr_t context)
{
    tmr${timerNum}Obj.callback = callback;
    tmr${timerNum}Obj.context = context;
}

void __attribute__((used)) TIMER_${timerNum}_InterruptHandler(void)
{
    uint32_t status = IFS0bits.T${timerNum}IF;
    
    /* Clear interrupt flag */
    IFS0CLR = _IFS0_T${timerNum}IF_MASK;

    if (tmr${timerNum}Obj.callback != NULL)
    {
        uintptr_t context = tmr${timerNum}Obj.context;
        tmr${timerNum}Obj.callback(status, context);
    }
}
`;
}

/**
 * Generate timer interrupt handler declaration for interrupts.c
 */
export function generateTimerInterruptDeclaration(config: TimerConfiguration): string {
    const { timer, priority } = config;
    const is32Bit = timer.length === 2;
    const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
    
    return `void __attribute__((used)) __ISR(_TIMER_${timerNum}_VECTOR, ipl${priority}SRS) TIMER_${timerNum}_Handler(void)
{
    TIMER_${timerNum}_InterruptHandler();
}`;
}

/**
 * Generate timer IPC initialization for EVIC_Initialize()
 */
export function generateTimerIPC(config: TimerConfiguration): string {
    const { timer, priority, subPriority } = config;
    const is32Bit = timer.length === 2;
    const timerNum = is32Bit ? parseInt(timer[0]) : parseInt(timer);
    
    // IPC register calculation: IPC0-IPC47
    // Each IPC has 4 interrupt sources, each taking 8 bits
    // Timer1 = IFS0<4>  -> IPC1
    // Timer2 = IFS0<9>  -> IPC2
    // Timer3 = IFS0<14> -> IPC3
    // etc.
    const ipcNum = timerNum;
    const ipcShift = 0; // Timer interrupts are typically at bits 0-4 of their IPC register
    const priorityBits = (priority << 2) | subPriority;
    const ipcValue = priorityBits;
    
    return `    IPC${ipcNum}SET = 0x${ipcValue.toString(16).toUpperCase()}U;  /* TIMER_${timerNum}: Priority ${priority} / Subpriority ${subPriority} */`;
}
