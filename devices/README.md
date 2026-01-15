# Device Definitions

This directory contains device definitions in JSON format for the XC Project Importer extension.

## JSON Schema

Each JSON file represents a device family with configuration bits and device list:

```json
{
    "family": "PIC32MZ-EF (High Performance)",
    "description": "Short description of the family",
    "configBits": [
        "// DEVCFG3 - Device Configuration Register 3",
        "#pragma config USERID = 0xFFFF          // User ID bits (default = 0xFFFF)",
        "#pragma config FMIIEN = OFF             // Ethernet RMII/MII Enable (OFF = RMII mode)"
    ],
    "devices": [
        {
            "label": "32MZ2048EFH064",
            "description": "2MB Flash, 512KB RAM, 64-pin (EFH - CAN, 252MHz)"
        }
    ]
}
```

### Schema Fields

- **family** (string, required): Display name for the device family
- **description** (string, required): Brief description of family characteristics
- **configBits** (object, required): Configuration pragma lines by variant
  - Must contain at least a **"default"** variant that works for ALL devices
  - Can contain additional variants like "with-usb", "with-can", etc.
  - Each variant is an array of strings (one line per pragma)
  - Include comments with inline explanations
- **devices** (array of objects, required): List of all devices in this family
  - **label** (string): Device part number (e.g., "32MZ2048EFH064")
  - **description** (string): Memory, features, and pin count
  - **configVariant** (string, optional): Which configBits variant to use (defaults to "default")

### Config Bits Variants

Different devices in a family may have different peripheral sets (USB, CAN, Ethernet, etc.) and thus different configuration options. Use variants to handle this:

```json
{
  "configBits": {
    "default": [
      "// Minimal config that works for ALL devices in family",
      "#pragma config FNOSC = SPLL",
      "#pragma config POSCMOD = EC"
    ],
    "with-usb": [
      "// Config for devices with USB peripheral",
      "#pragma config FNOSC = SPLL",
      "#pragma config POSCMOD = EC",
      "#pragma config UPLLEN = ON              // USB PLL Enable"
    ]
  },
  "devices": [
    {
      "label": "32MZ2048EFG064",
      "description": "2MB Flash, no USB"
    },
    {
      "label": "32MZ2048EFH064",
      "description": "2MB Flash, with USB/CAN",
      "configVariant": "with-usb"
    }
  ]
}
```

## Supported Families

- **pic32mz-ef.json** - PIC32MZ-EF family (39 devices)
- **pic32mx.json** - PIC32MX family (121 devices)

## Adding New Devices

### Adding to Existing Family

1. Open the appropriate JSON file (e.g., `pic32mx.json`)
2. Add a new device entry to the `devices` array:
   ```json
   {
       "label": "32MX795F512L",
       "description": "512KB Flash, 128KB RAM, 100-pin (USB+Ethernet+CAN)"
   }
   ```
3. Save the file - no code changes needed!

### Updating Configuration Bits

1. Open the appropriate JSON file (e.g., `pic32mz-ef.json`)
2. Edit the `configBits` array to add/modify #pragma config lines:
   ```json
   "configBits": [
       "// DEVCFG3 - Device Configuration Register 3",
       "#pragma config USERID = 0xFFFF          // User ID bits (default = 0xFFFF)",
       "#pragma config FMIIEN = OFF             // Ethernet RMII/MII Enable (OFF = RMII mode)"
   ]
   ```
3. All devices in the family will automatically use the updated configuration
4. No TypeScript code changes required!

### Adding New Family

1. Create a new JSON file (e.g., `pic18.json`, `dspic33.json`)
2. Use the same schema as above (must include `configBits` array)
3. File is automatically loaded by `deviceLoader.ts`
4. No code changes required in extension!

Example for new family:
```json
{
    "family": "PIC18 (8-bit)",
    "description": "8-bit PIC microcontrollers with advanced peripherals",
    "configBits": [
        "// CONFIG1H",
        "#pragma config FOSC = INTIO67      // Oscillator Selection (Internal oscillator)",
        "#pragma config PLLCFG = OFF        // PLL Enable (PLL disabled)",
        "#pragma config FCMEN = OFF         // Fail-Safe Clock Monitor (OFF)",
        "// Add more config bits as needed..."
    ],
    "devices": [
        {
            "label": "18F4550",
            "description": "32KB Flash, 2KB RAM, 40-pin (USB)"
        }
    ]
}
```

## Device Naming Convention

### PIC32 Devices
- Format: `32MX[flash][variant][pins]` or `32MZ[flash][variant][pins]`
- Example: `32MZ2048EFH144`
  - `32MZ` = PIC32MZ family
  - `2048` = 2048KB (2MB) Flash
  - `EF` = Device subfamily
  - `H` = Feature variant (H = CAN support)
  - `144` = Pin count

### Description Format
Format: `[Flash] Flash, [RAM] RAM, [Pins]-pin (Features)`

Examples:
- `"2MB Flash, 512KB RAM, 64-pin (EFH - CAN, 252MHz)"`
- `"512KB Flash, 128KB RAM, 100-pin (USB+Ethernet+CAN)"`

## Feature Abbreviations

- **USB** - USB 2.0 Full Speed
- **CAN** - CAN 2.0B controller
- **Ethernet** - 10/100 Ethernet MAC
- **Crypto** - Hardware crypto engine (AES, DES, SHA)
- **CTMU** - Charge Time Measurement Unit (for capacitive touch)

## Roadmap

Future families to add:
- **PIC8-bit** - PIC10/12/16/18 families (1000+ devices)
- **PIC16-bit** - dsPIC30/33 families
- **PIC24** - PIC24F/H families
- **SAM** - Microchip ARM Cortex-M devices

## Validation

The `deviceLoader.ts` module will automatically validate JSON files on load. If a file is malformed, it will:
1. Log an error to the console
2. Skip the malformed file
3. Continue loading other valid files
4. Fall back to built-in minimal device list if all fail
