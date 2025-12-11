# PIC32MZ Peripheral Templates

This directory contains Freemarker-style templates for PIC32MZ peripheral libraries, designed to match MCC Harmony 3 output.

## Template Placeholder Format

Templates use `${PLACEHOLDER_NAME}` for simple substitution and conditional logic for optional features.

### Common Placeholders

All peripherals:
- `${DEVICE_NAME}` - e.g., PIC32MZ1024EFH064
- `${CPU_CLOCK_FREQUENCY}` - System clock in Hz

### UART Placeholders

| Placeholder | Example | Description |
|------------|---------|-------------|
| `${UART_INSTANCE_NAME}` | UART1 | Peripheral instance (UART1, UART2, etc.) |
| `${UART_INSTANCE_NUM}` | 1 | Instance number (1, 2, 3, etc.) |
| `${UART_CLOCK_FREQ}` | 100000000 | Peripheral clock frequency |
| `${BRG_VALUE}` | 0x108 | Baud rate generator value |
| `${UMODE_VALUE}` | 8008 | UxMODE register init value |
| `${UART_STOPBIT_SELECT}` | 0 | Stop bits (0=1bit, 1=2bits) |
| `${UART_PDBIT_SELECT}` | 0 | Parity/data select |
| `${UART_UEN_SELECT}` | 0 | UEN control bits |
| `${UART_BRGH}` | 1 | High baud rate select |
| `${UART_INTERRUPT_MODE_ENABLE}` | true | Interrupt mode enabled |
| `${UART_AUTOMATIC_ADDR_DETECTION_ENABLE}` | false | 9-bit address detection |
| `${UART_9BIT_MODE_ADDR}` | 0 | 9-bit mode address |
| `${UART_INTERRUPT_COUNT}` | 3 | Number of interrupt vectors |
| `${UART_FAULT_IFS_REG}` | IFS4 | Fault interrupt flag register |
| `${UART_FAULT_IEC_REG}` | IEC4 | Fault interrupt enable register |
| `${UART_RX_IFS_REG}` | IFS4 | RX interrupt flag register |
| `${UART_RX_IEC_REG}` | IEC4 | RX interrupt enable register |
| `${UART_TX_IFS_REG}` | IFS4 | TX interrupt flag register |
| `${UART_TX_IEC_REG}` | IEC4 | TX interrupt enable register |

### Timer Placeholders

| Placeholder | Example | Description |
|------------|---------|-------------|
| `${TMR_INSTANCE_NAME}` | TMR2 | Timer instance |
| `${TMR_INSTANCE_NUM}` | 2 | Instance number |
| `${TMR_CLOCK_FREQ}` | 100000000 | Timer clock frequency |
| `${TMR_INTERRUPT_ENABLE}` | true | Enable interrupts |
| etc... | | (see existing timer templates) |

### GPIO Placeholders

See existing `harmonyGpioGen.ts` for GPIO placeholder format.

## Conditional Blocks

Templates support conditional logic:

```freemarker
<#if UART_INTERRUPT_MODE_ENABLE == true>
    // Interrupt mode code
<#else>
    // Polling mode code
</#if>
```

## File Structure

Each peripheral has:
- `plib_<peripheral>.h.template` - Header file
- `plib_<peripheral>.c.template` - Implementation file
- `plib_<peripheral>_common.h.template` - Common definitions (if applicable)

Generators in `src/generators/peripherals/mz/` process these templates.

## Adding New Peripherals

1. Create peripheral directory under `mz/`
2. Copy `.ftl` templates from `Harmony3/csp/peripheral/<name>_<id>/templates/`
3. Convert FreeMarker syntax to our placeholder format
4. Create TypeScript generator in `src/generators/peripherals/mz/`
5. Update this README with placeholder documentation
