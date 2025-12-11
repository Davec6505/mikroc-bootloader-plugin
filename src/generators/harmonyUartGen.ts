/**
 * UART Peripheral Generator for PIC32MZ
 * Generates plib_uartX.c and plib_uartX.h for UART peripheral configuration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface UartConfig {
    instanceName: string;       // "UART1", "UART2", etc.
    instanceNum: number;        // 1, 2, 3, 4, 5, 6
    operatingMode: 'blocking' | 'non-blocking' | 'ring-buffer';
    stopBits: 1 | 2;
    parityAndData: '8N' | '9N' | '8O' | '8E';  // 8-bit no parity, 9-bit, 8-bit odd, 8-bit even
    highBaudRate: boolean;      // true = High-Speed (BRGH=1, 4x), false = Standard (BRGH=0, 16x)
    uenSelect: number;          // 0-3 for different pin configurations
    baudRate: number;           // e.g., 115200
    clockFreq: number;          // From PBCLK2 (e.g., 50000000)
    rxRingBufferSize?: number;  // RX buffer size for ring-buffer mode (default: 256)
    txRingBufferSize?: number;  // TX buffer size for ring-buffer mode (default: 256)
}

export interface BaudRateResult {
    brgValue: number;
    actualBaud: number;
    errorPercent: number;
}

export class HarmonyUartGenerator {
    private templateDir: string;

    constructor(templateDir: string) {
        this.templateDir = templateDir;
    }

    /**
     * Calculate BRG value and baud rate error
     */
    public calculateBaudRate(config: UartConfig): BaudRateResult {
        const divisor = config.highBaudRate ? 4 : 16;
        const brgValue = Math.round((config.clockFreq / (divisor * config.baudRate)) - 1);
        const actualBaud = config.clockFreq / (divisor * (brgValue + 1));
        const errorPercent = ((actualBaud - config.baudRate) / config.baudRate) * 100;
        
        return { brgValue, actualBaud, errorPercent };
    }

    /**
     * Get UxMODE register value
     */
    private getUMODEValue(config: UartConfig): string {
        let value = 0;

        // BRGH bit (bit 3)
        if (config.highBaudRate) {
            value |= (1 << 3);
        }

        // PDSEL (Parity and Data Selection) bits (bits 1-2)
        switch (config.parityAndData) {
            case '8N':
                value |= 0x00;  // 8-bit data, no parity
                break;
            case '9N':
                value |= 0x06;  // 9-bit data, no parity
                break;
            case '8E':
                value |= 0x02;  // 8-bit data, even parity
                break;
            case '8O':
                value |= 0x04;  // 8-bit data, odd parity
                break;
        }

        // STSEL (Stop Selection) bit (bit 0)
        if (config.stopBits === 2) {
            value |= 0x01;
        }

        // UEN (UARTx Enable) bits (bits 8-9)
        value |= (config.uenSelect << 8);

        return value.toString(16).toUpperCase().padStart(4, '0');
    }

    /**
     * Get interrupt register names based on UART instance
     */
    private getInterruptRegisters(instanceNum: number): {
        faultIFS: string;
        faultIEC: string;
        rxIFS: string;
        rxIEC: string;
        txIFS: string;
        txIEC: string;
    } {
        // PIC32MZ interrupt mapping (from datasheet)
        const mapping: { [key: number]: string } = {
            1: 'IFS3',
            2: 'IFS4',
            3: 'IFS4',
            4: 'IFS5',
            5: 'IFS5',
            6: 'IFS5'
        };

        const ifsReg = mapping[instanceNum] || 'IFS4';
        const iecReg = ifsReg.replace('IFS', 'IEC');

        return {
            faultIFS: ifsReg,
            faultIEC: iecReg,
            rxIFS: ifsReg,
            rxIEC: iecReg,
            txIFS: ifsReg,
            txIEC: iecReg
        };
    }

    /**
     * Process UART template
     */
    private processTemplate(template: string, config: UartConfig): string {
        const baudResult = this.calculateBaudRate(config);
        const umodeValue = this.getUMODEValue(config);
        const intRegs = this.getInterruptRegisters(config.instanceNum);

        // Parity and data selection for template
        const pdselMap: { [key: string]: string } = {
            '8N': '0',
            '9N': '3',
            '8E': '1',
            '8O': '2'
        };

        const replacements: { [key: string]: string } = {
            'UART_INSTANCE_NAME': config.instanceName,
            'UART_INSTANCE_NUM': config.instanceNum.toString(),
            'UART_CLOCK_FREQ': config.clockFreq.toString(),
            'BRG_VALUE': `0x${baudResult.brgValue.toString(16).toUpperCase()}`,
            'UMODE_VALUE': umodeValue,
            'UART_STOPBIT_SELECT': config.stopBits === 1 ? '0' : '1',
            'UART_PDBIT_SELECT': pdselMap[config.parityAndData],
            'UART_UEN_SELECT': config.uenSelect.toString(),
            'UART_BRGH': config.highBaudRate ? '1' : '0',
            'UART_INTERRUPT_MODE_ENABLE': config.operatingMode === 'non-blocking' ? 'true' : 'false',
            'UART_AUTOMATIC_ADDR_DETECTION_ENABLE': 'false',
            'UART_9BIT_MODE_ADDR': '0',
            'UART_INTERRUPT_COUNT': '3',  // Separate interrupt vectors
            'UART_FAULT_IFS_REG': intRegs.faultIFS,
            'UART_FAULT_IEC_REG': intRegs.faultIEC,
            'UART_RX_IFS_REG': intRegs.rxIFS,
            'UART_RX_IEC_REG': intRegs.rxIEC,
            'UART_TX_IFS_REG': intRegs.txIFS,
            'UART_TX_IEC_REG': intRegs.txIEC,
            'UART_RX_RING_BUFFER_SIZE': (config.rxRingBufferSize || 256).toString(),
            'UART_TX_RING_BUFFER_SIZE': (config.txRingBufferSize || 256).toString(),
        };

        let result = template;

        // Replace ${VARIABLE} placeholders
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
            result = result.replace(regex, value);
        }

        // Replace ?lower_case modifier
        result = result.replace(/\$\{(\w+)\?lower_case\}/g, (match, varName) => {
            const value = replacements[varName] || match;
            return value.toLowerCase();
        });

        // Handle conditional blocks
        result = this.processConditionals(result, config);

        return result;
    }

    /**
     * Process FreeMarker conditional blocks
     */
    private processConditionals(content: string, config: UartConfig): string {
        let result = content;

        // Process <#if UART_INTERRUPT_MODE_ENABLE == true>
        const interruptMode = config.operatingMode === 'non-blocking';
        result = this.processIfBlock(result, 'UART_INTERRUPT_MODE_ENABLE == true', interruptMode);
        result = this.processIfBlock(result, 'UART_INTERRUPT_MODE_ENABLE == false', !interruptMode);

        // Process <#if core.CoreSysIntFile == true> (always true for our case)
        result = this.processIfBlock(result, 'core.CoreSysIntFile == true', true);

        // Process <#if UART_AUTOMATIC_ADDR_DETECTION_ENABLE == true>
        result = this.processIfBlock(result, 'UART_AUTOMATIC_ADDR_DETECTION_ENABLE == true', false);

        return result;
    }

    /**
     * Process a single conditional block
     */
    private processIfBlock(content: string, condition: string, keep: boolean): string {
        const ifRegex = new RegExp(`<#if ${condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>([\\s\\S]*?)(?:<#else>([\\s\\S]*?))?</#if>`, 'g');
        
        return content.replace(ifRegex, (match, ifContent, elseContent) => {
            if (keep) {
                return ifContent || '';
            } else {
                return elseContent || '';
            }
        });
    }

    /**
     * Generate UART header file
     */
    public generateUartHeader(config: UartConfig, templatePath: string): string {
        const template = fs.readFileSync(templatePath, 'utf8');
        return this.processTemplate(template, config);
    }

    /**
     * Generate UART source file
     */
    public generateUartSource(config: UartConfig, templatePath: string): string {
        const template = fs.readFileSync(templatePath, 'utf8');
        return this.processTemplate(template, config);
    }

    /**
     * Generate UART common header (no processing needed, static file)
     */
    public generateUartCommonHeader(templatePath: string): string {
        return fs.readFileSync(templatePath, 'utf8');
    }

    /**
     * Generate all UART files
     */
    public generate(config: UartConfig): {
        header: string;
        source: string;
        commonHeader: string;
    } {
        const templateBase = path.join(this.templateDir, 'mz', 'uart');
        
        // Select templates based on operating mode
        const headerTemplate = config.operatingMode === 'ring-buffer'
            ? 'plib_uart_ring_buffer.h.template'
            : 'plib_uart.h.template';
        const sourceTemplate = config.operatingMode === 'ring-buffer'
            ? 'plib_uart_ring_buffer.c.template'
            : 'plib_uart.c.template';
        
        return {
            header: this.generateUartHeader(
                config,
                path.join(templateBase, headerTemplate)
            ),
            source: this.generateUartSource(
                config,
                path.join(templateBase, sourceTemplate)
            ),
            commonHeader: this.generateUartCommonHeader(
                path.join(templateBase, 'plib_uart_common.h.template')
            )
        };
    }

    /**
     * Write UART files to disk
     */
    public writeFiles(outputDir: string, config: UartConfig): void {
        const files = this.generate(config);
        const instanceLower = config.instanceName.toLowerCase();

        const uartDir = path.join(outputDir, 'peripheral', 'uart');
        if (!fs.existsSync(uartDir)) {
            fs.mkdirSync(uartDir, { recursive: true });
        }

        fs.writeFileSync(path.join(uartDir, `plib_${instanceLower}.h`), files.header, 'utf8');
        fs.writeFileSync(path.join(uartDir, `plib_${instanceLower}.c`), files.source, 'utf8');
        
        // Only write common header once (not per instance)
        const commonPath = path.join(uartDir, 'plib_uart_common.h');
        if (!fs.existsSync(commonPath)) {
            fs.writeFileSync(commonPath, files.commonHeader, 'utf8');
        }
    }

    /**
     * Generate interrupt handler declarations for interrupts.h
     */
    public generateInterruptDeclarations(config: UartConfig): string {
        // Both non-blocking and ring-buffer modes use interrupts
        if (config.operatingMode === 'blocking') {
            return '';
        }

        return `void ${config.instanceName}_FAULT_InterruptHandler( void );
void ${config.instanceName}_RX_InterruptHandler( void );
void ${config.instanceName}_TX_InterruptHandler( void );`;
    }

    /**
     * Generate interrupt vector assignments for interrupts.c
     */
    public generateInterruptVectors(config: UartConfig): string {
        // Both non-blocking and ring-buffer modes use interrupts
        if (config.operatingMode === 'blocking') {
            return '';
        }

        const instanceLower = config.instanceName.toLowerCase();
        
        return `void __attribute__((used)) __ISR(_UART_${config.instanceNum}_FAULT_VECTOR, ipl1SRS) UART_${config.instanceNum}_FAULT_Handler(void)
{
    ${config.instanceName}_FAULT_InterruptHandler();
}

void __attribute__((used)) __ISR(_UART_${config.instanceNum}_RX_VECTOR, ipl1SRS) UART_${config.instanceNum}_RX_Handler(void)
{
    ${config.instanceName}_RX_InterruptHandler();
}

void __attribute__((used)) __ISR(_UART_${config.instanceNum}_TX_VECTOR, ipl1SRS) UART_${config.instanceNum}_TX_Handler(void)
{
    ${config.instanceName}_TX_InterruptHandler();
}`;
    }

    /**
     * Get default UART configuration
     */
    public static getDefaultConfig(instanceNum: number, pbclk2Freq: number): UartConfig {
        return {
            instanceName: `UART${instanceNum}`,
            instanceNum: instanceNum,
            operatingMode: 'non-blocking',
            stopBits: 1,
            parityAndData: '8N',
            highBaudRate: true,  // High-Speed mode (4x)
            uenSelect: 0,        // UxTX and UxRX pins are enabled and used
            baudRate: 115200,
            clockFreq: pbclk2Freq,
        };
    }
}
