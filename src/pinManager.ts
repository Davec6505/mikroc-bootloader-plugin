/**
 * Pin Manager - Integrates pin database with code generation
 */

import { DevicePin, PinConfiguration, PinManagerState, PackageType } from './devices/pic32mz/types';
import { PIC32MZ_PINS, getPinsForPackage } from './devices/pic32mz/pinTables';
import { generateMikroCGpioCode } from './generators/mikrocGpioGen';
import { generateHarmonyGpioHeader, generateHarmonyGpioSource } from './generators/harmonyGpioGen';
import { generateMikroCPPSCode, generateHarmonyPPSCode } from './generators/ppsCodeGen';

export class PinManager {
    private state: PinManagerState;
    private availablePins: DevicePin[];

    constructor(deviceName: string, packageType: PackageType) {
        this.state = {
            deviceName,
            packageType,
            pins: []
        };
        this.availablePins = getPinsForPackage(packageType);
    }

    /**
     * Get all pins available for the selected package
     */
    getAvailablePins(): DevicePin[] {
        return this.availablePins;
    }

    /**
     * Get current pin configurations
     */
    getPinConfigurations(): PinConfiguration[] {
        return this.state.pins;
    }

    /**
     * Set pin configuration
     */
    setPinConfiguration(config: PinConfiguration): void {
        const existingIndex = this.state.pins.findIndex(p => p.pinName === config.pinName);
        if (existingIndex >= 0) {
            this.state.pins[existingIndex] = config;
        } else {
            this.state.pins.push(config);
        }
    }

    /**
     * Remove pin configuration
     */
    removePinConfiguration(pinName: string): void {
        this.state.pins = this.state.pins.filter(p => p.pinName !== pinName);
    }

    /**
     * Get pin configuration by name
     */
    getPinConfiguration(pinName: string): PinConfiguration | undefined {
        return this.state.pins.find(p => p.pinName === pinName);
    }

    /**
     * Change package type (reloads available pins)
     */
    setPackageType(packageType: PackageType): void {
        this.state.packageType = packageType;
        this.availablePins = getPinsForPackage(packageType);
        
        // Remove configurations for pins that don't exist in new package
        this.state.pins = this.state.pins.filter(config => {
            return this.availablePins.some(pin => pin.pinName === config.pinName);
        });
    }

    /**
     * Generate mikroC GPIO code
     */
    generateMikroCCode(): string {
        let code = '';
        
        // GPIO code
        const gpioCode = generateMikroCGpioCode(this.state.pins);
        if (gpioCode) {
            code += gpioCode + '\n';
        }

        // PPS code
        const ppsCode = generateMikroCPPSCode(this.state.pins);
        if (ppsCode && ppsCode !== '// No PPS configured\n') {
            code += '\n' + ppsCode;
        }

        return code || '// No pins configured\n';
    }

    /**
     * Generate Harmony/XC32 code
     */
    generateHarmonyCode(): {
        gpioHeader: string;
        gpioSource: string;
        ppsCode: string;
    } {
        return {
            gpioHeader: generateHarmonyGpioHeader(this.state.pins),
            gpioSource: generateHarmonyGpioSource(this.state.pins),
            ppsCode: generateHarmonyPPSCode(this.state.pins)
        };
    }

    /**
     * Export state for persistence
     */
    exportState(): PinManagerState {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Import state from persistence
     */
    importState(state: PinManagerState): void {
        this.state = state;
        this.availablePins = getPinsForPackage(state.packageType);
    }

    /**
     * Get pin table data for UI (formatted for display)
     */
    getPinTableData(): Array<{
        pinNum: number | null;
        pinId: string;
        customName: string;
        function: string;
        direction: string;
        state: string;
        mode: string;
        rpNumber?: number;
        analogChannel?: string;
        alternateFunctions: string[];
    }> {
        return this.availablePins.map(pin => {
            const config = this.getPinConfiguration(pin.pinName);
            const pinNum = pin.pinNumber[this.state.packageType];

            if (pinNum === null) {
                return null;
            }

            let customName = '';
            let functionStr = pin.defaultFunction;
            let direction = '';
            let state = '';
            let mode = 'Not Configured';

            if (config) {
                if (config.mode === 'GPIO' && config.gpio) {
                    customName = config.gpio.customName || '';
                    direction = config.gpio.direction;
                    state = config.gpio.direction === 'Output' 
                        ? (config.gpio.initialState || 'Low')
                        : 'n/a';
                    functionStr = 'GPIO';
                    mode = 'GPIO';
                } else if (config.mode === 'Analog' && config.analog) {
                    functionStr = config.analog.channelName;
                    direction = 'Input';
                    state = 'n/a';
                    mode = 'Analog';
                } else if (config.mode === 'Peripheral' && config.peripheral) {
                    functionStr = config.peripheral.function;
                    direction = config.peripheral.ppsInputSignal ? 'Input' : 'Output';
                    state = 'n/a';
                    mode = 'Peripheral';
                }
            }

            return {
                pinNum,
                pinId: pin.pinName,
                customName,
                function: functionStr,
                direction,
                state,
                mode,
                rpNumber: pin.rpNumber,
                analogChannel: pin.analogChannel,
                alternateFunctions: pin.alternateFunctions
            };
        }).filter(p => p !== null) as Array<any>;
    }
}
