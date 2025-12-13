# TypeScript Primer for JavaScript Developers

You already know JavaScript, HTML, and CSS. This document focuses on **what TypeScript adds on top of JavaScript**, using patterns you will see directly in this extension.

Think of TypeScript as:

> **JavaScript + static types + tooling help → compiled back into JavaScript.**

All TypeScript code in `src/` gets compiled into plain JavaScript under `out/` and that is what VS Code actually runs.

---

## 1. Big Picture: Where TypeScript Fits in This Project

**Files involved:**
- Source (TypeScript): `src/**/*.ts`
- Output (JavaScript): `out/**/*.js`
- Config: `tsconfig.json`
- Entry point: `out/extension.js` (compiled from `src/extension.ts`)

Flow:
1. You edit `.ts` files in `src/`.
2. `npm run compile` (or `npm run watch`) runs the TypeScript compiler (`tsc`).
3. `tsc` checks types and emits `.js` files into `out/`.
4. `package.json` points VS Code at `./out/extension.js`.

If TypeScript reports errors, the extension may still compile, but the errors warn you about likely bugs.

---

## 2. Type Annotations (`:`)

Type annotations say what kind of value something should hold.

### 2.1 Variables

```ts
let count: number = 0;
let name: string = 'PIC32';
let isReady: boolean = true;
let maybeHex: string | null = null;
```

- `: number`, `: string`, `: boolean` etc. are **type annotations**.
- `string | null` is a **union type**: value can be `string` or `null`.

Without the annotations, this would still be valid JavaScript, but TypeScript would not be able to help as much.

### 2.2 Function parameters and return types

```ts
function add(a: number, b: number): number {
    return a + b;
}
```

In your project (from `src/bundledTools.ts`):

```ts
public async verifyMake(): Promise<{ available: boolean; path: string; message: string }> {
    // ...
}
```

- `(): Promise<{ ... }>`: this async function returns a **Promise** that eventually resolves to an object.
- Inside the `{ ... }`, you describe the object shape:
  - `available: boolean`
  - `path: string`
  - `message: string`

If you accidentally return `{ available: 'yes' }`, TypeScript will complain because `'yes'` is not a `boolean`.

---

## 3. Interfaces and Type Aliases

Instead of repeating object shapes, you can name them.

### 3.1 Interfaces

```ts
interface MakeCheckResult {
    available: boolean;
    path: string;
    message: string;
}

async function verifyMake(): Promise<MakeCheckResult> {
    // ...
}
```

Use `interface` primarily for **object shapes** that you might want classes to `implements` or that you share around.

### 3.2 Type aliases

```ts
type Platform = 'win32' | 'linux' | 'darwin';

let platform: Platform;
platform = 'win32';     // OK
platform = 'something'; // Error
```

`type` is flexible:
- Union types (`A | B`)
- Intersection types (`A & B`)
- Function types (`type Fn = (x: number) => string`)
- Aliases of other complex types

In practice:
- Use `interface` for data shapes.
- Use `type` for unions and more advanced combinations.

---

## 4. Classes with Types and Access Modifiers

JavaScript already has classes. TypeScript adds:
- **Typed fields and methods**
- **Visibility modifiers**: `public`, `private`, `protected`, `readonly`

Example from `src/bundledTools.ts` (simplified):

```ts
export class BundledToolsManager {
    private extensionPath: string;
    private platform: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.platform = process.platform === 'win32' ? 'win32' :
                        process.platform === 'darwin' ? 'darwin' : 'linux';
    }

    public getBinPath(): string {
        return path.join(this.extensionPath, 'bin', this.platform);
    }
}
```

New bits vs plain JS:
- `private extensionPath: string;` declares a field with type `string` and marks it private.
- `public getBinPath(): string` says this method is public and returns a `string`.

### 4.1 Access modifiers

- `public` (default): accessible anywhere.
- `private`: only inside the same class.
- `protected`: inside the class and subclasses.
- `readonly`: can be set in the constructor, but not changed afterward.

Example:

```ts
class Config {
    public name: string;
    private secretKey: string;
    readonly createdAt: Date;

    constructor(name: string, secretKey: string) {
        this.name = name;
        this.secretKey = secretKey;
        this.createdAt = new Date();
    }
}
```

### 4.2 Parameter properties (shortcut)

You might also see:

```ts
class Config {
    constructor(
        public name: string,
        private secretKey: string,
        readonly createdAt: Date = new Date(),
    ) {}
}
```

This automatically:
- Declares the fields (`name`, `secretKey`, `createdAt`).
- Assigns the constructor parameters to them.

---

## 5. Generics: `Promise<T>`, `Array<T>`, etc.

Generics are **types that depend on another type**.

Common ones:

```ts
let p: Promise<string>;   // a promise resolving to a string
let names: Array<string>; // an array of strings
let names2: string[];     // same as Array<string>
```

Your code:

```ts
public async verifyMake(): Promise<{ available: boolean; path: string; message: string }> { ... }
```

Here `Promise<...>` means “a promise that resolves to an object with those fields”.

A custom generic function:

```ts
function identity<T>(value: T): T {
    return value;
}

const a = identity<number>(42);   // T = number
const b = identity('hello');      // T = string (inferred)
```

You’ll see generics heavily with:
- `Promise<T>`
- `Array<T>` / `T[]`
- `Map<K, V>`
- VS Code APIs (`vscode.QuickPickItem`, `vscode.Uri`, etc.)

---

## 6. Union Types, Optionals, and Narrowing

### 6.1 Union types: `A | B`

```ts
let input: string | number;

input = 'abc';  // OK
input = 42;     // OK
input = true;   // Error
```

Very common in APIs that accept multiple forms:

```ts
function open(pathOrUri: string | vscode.Uri) {
    if (typeof pathOrUri === 'string') {
        // handle string path
    } else {
        // handle vscode.Uri
    }
}
```

This `if (typeof ...)` is called **type narrowing**: inside each branch, TypeScript knows which type you’re dealing with.

### 6.2 Optional properties: `?`

```ts
interface ToolInfo {
    name: string;
    path?: string; // may be undefined
}

const t: ToolInfo = { name: 'make' };      // OK
const t2: ToolInfo = { name: 'make', path: 'C:/...' }; // OK
```

You must handle the possibility that `path` might be missing or undefined.

### 6.3 Optional parameters

```ts
function log(message: string, level?: 'info' | 'warn' | 'error') {
    const lvl = level ?? 'info';
    console.log(`[${lvl}] ${message}`);
}

log('hello');        // lvl = 'info'
log('oops', 'warn'); // lvl = 'warn'
```

---

## 7. Async Functions and Promise Types

Async/await are JavaScript features, but TypeScript forces you to be precise about the promise type.

```ts
async function getDeviceName(device: PIC32Device): Promise<string> {
    // do something async
    return device.name;
}
```

- `async` automatically wraps the return value in a `Promise`.
- The annotation `: Promise<string>` says: “when this promise resolves, it gives me a string”.

In your project (`src/extension.ts`):

```ts
const flashDisposable = vscode.commands.registerCommand('mikroc-pic32-bootloader.flash', async () => {
    try {
        await flashToDevice();
    } catch (error) {
        vscode.window.showErrorMessage(`Flash failed: ${error}`);
    }
});
```

`flashToDevice()` is an `async` function returning `Promise<void>`. Awaiting it lets you use normal `try/catch` around asynchronous operations.

---

## 8. Modules and Imports/Exports

Same concept as ES modules, but type-checked.

### 8.1 Exporting

```ts
// src/bundledTools.ts
export class BundledToolsManager { ... }

export interface MakeCheckResult { ... }
```

### 8.2 Importing

```ts
// src/extension.ts
import { BundledToolsManager } from './bundledTools';
```

If you only need the type (not the runtime value), you can optionally use:

```ts
import type { MakeCheckResult } from './bundledTools';
```

This is sometimes useful for performance in large codebases, but not required.

---

## 9. `tsconfig.json` and Strictness

`tsconfig.json` tells the compiler **how to compile** and **how strict to be**.

Typical fields:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "out",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "node"
  },
  "include": ["src"]
}
```

Key options:

- `strict: true` enables a bunch of useful checks:
  - `noImplicitAny`: every value should have a type.
  - `strictNullChecks`: `null`/`undefined` must be handled explicitly.
- `rootDir` / `outDir`: define the source and output folders.

You don’t have to memorize these, but it helps to know that **type behavior is controlled there**.

---

## 10. TypeScript and VS Code Tooling

VS Code + TypeScript gives you:

- **IntelliSense**: autocomplete with types.
- **Inline errors**: red squiggles where types don’t match.
- **Go to definition** / **Find references** that understand types.
- **Refactorings**: rename symbols, extract methods safely.

Workflow tip:

1. Open a `.ts` file.
2. Intentionally make a small type mistake (e.g. assign number to string).
3. See how VS Code reports it.
4. Undo.

That feedback loop helps you learn quickly.

---

## 11. Practical Exercises Using This Repo

To get comfortable, try these small steps directly in this project.

### 11.1 Add a typed helper in `bundledTools.ts`

Goal: practice object types and return types.

1. Open `src/bundledTools.ts`.
2. Add an interface:

   ```ts
   interface ToolStatus {
       name: string;
       available: boolean;
       path: string;
   }
   ```

3. Add a function that returns `ToolStatus` for make:

   ```ts
   public async getMakeStatus(): Promise<ToolStatus> {
       const result = await this.verifyMake();
       return {
           name: 'make',
           available: result.available,
           path: result.path,
       };
   }
   ```

4. Hover over `getMakeStatus` and see how VS Code shows the type.

### 11.2 Add a union type for platform

1. In `bundledTools.ts`, define:

   ```ts
   type SupportedPlatform = 'win32' | 'darwin' | 'linux';
   ```

2. Change `platform: string` to `platform: SupportedPlatform`.
3. See how this constrains the allowed values and helps autocomplete.

### 11.3 Tighten a function signature in `extension.ts`

1. Find a function like `calculateClockFromConfig(config: Map<number, string>): number`.
2. Change its return type to something more descriptive, e.g.:

   ```ts
   interface ClockInfo {
       frequencyMHz: number;
   }

   function calculateClockFromConfig(config: Map<number, string>): ClockInfo {
       // ...
       return { frequencyMHz: value };
   }
   ```

3. See how callers now have to use `result.frequencyMHz`, and TypeScript ensures they don’t accidentally treat it as a string.

---

## 12. Mental Model Summary

When reading TypeScript in this project, ask yourself:

1. **What part is just JavaScript logic?**
   - Functions, loops, `await`, string handling, etc.
2. **What part is TypeScript "extra info"?**
   - `: Type` annotations
   - `interface` / `type` definitions
   - Generics like `Promise<T>`
   - `public` / `private` / `readonly`
   - Union types (`A | B`), optionals (`?`)

The second category doesn’t change runtime behavior, but:
- Documents intent.
- Lets the compiler catch mistakes.
- Powers your editor tooling.

If something feels unfamiliar, it’s almost always in that second category—and you can usually ignore it at first, then come back and learn it once you understand the underlying JavaScript.
