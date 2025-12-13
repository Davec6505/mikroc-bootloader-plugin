# TypeScript Cheat Sheet (JS Developer Edition)

Quick reference for the most common TypeScript features you’ll see in this project.

---

## Basics

### Type annotations

```ts
let count: number = 0;
let name: string = 'PIC32';
let isReady: boolean = true;
let maybeHex: string | null = null;
```

- `: number`, `: string`, etc. are **type annotations**.
- `A | B` is a **union type** (value can be A or B).

### Functions

```ts
function add(a: number, b: number): number {
    return a + b;
}

async function load(): Promise<string> {
    return 'done';
}
```

- Parameters and return types use `: Type`.
- `async` functions usually return `Promise<Something>`.

---

## Objects, Interfaces, Types

### Interfaces (object shapes)

```ts
interface ToolInfo {
    name: string;
    available: boolean;
    path?: string; // optional
}

function show(tool: ToolInfo) { /* ... */ }
```

### Type aliases

```ts
type Platform = 'win32' | 'linux' | 'darwin';

let p: Platform = 'win32';
```

Use:
- `interface` → object shapes you pass around.
- `type` → unions / advanced combinations.

---

## Classes and Access Modifiers

```ts
export class BundledToolsManager {
    private extensionPath: string;
    private platform: string;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.platform = 'win32';
    }

    public getBinPath(): string {
        return path.join(this.extensionPath, 'bin', this.platform);
    }
}
```

- `public` → visible everywhere (default).
- `private` → only inside this class.
- `protected` → class + subclasses.
- `readonly` → can’t be reassigned after construction.

**Parameter property shorthand:**

```ts
class Config {
    constructor(
        public name: string,
        private secret: string,
    ) {}
}
```

Declares and assigns the fields in one go.

---

## Generics

```ts
let p: Promise<string>;
let names: Array<string>;
let nums: number[]; // same as Array<number>

function identity<T>(value: T): T {
    return value;
}

const s = identity('hello'); // T = string
```

- `Promise<T>` = promise that resolves to `T`.
- `Array<T>` = array of `T`.

---

## Unions, Optionals, Narrowing

### Unions

```ts
let input: string | number;

if (typeof input === 'string') {
    // input is string here
} else {
    // input is number here
}
```

### Optional properties and parameters

```ts
interface Tool {
    name: string;
    path?: string; // may be undefined
}

function log(msg: string, level?: 'info' | 'warn' | 'error') {
    const lvl = level ?? 'info';
}
```

### Non-null assertion (use sparingly)

```ts
let maybePath: string | null = findPath();
let path2: string = maybePath!; // "trust me, not null"
```

---

## Imports and Exports

```ts
// bundledTools.ts
export class BundledToolsManager { /* ... */ }
export interface MakeCheckResult { /* ... */ }

// extension.ts
import { BundledToolsManager } from './bundledTools';
```

You can optionally separate type-only imports:

```ts
import type { MakeCheckResult } from './bundledTools';
```

---

## tsconfig and Strictness (Conceptual)

`tsconfig.json` controls:

- Target JS version (`target`)
- Module system (`module`)
- Input (`rootDir`) and output (`outDir`) folders
- Strictness (`strict`, `noImplicitAny`, `strictNullChecks`)

You normally **rarely edit** this—just know it affects how strict the compiler is.

---

## Quick Mental Checklist When Reading TS

When you see something unfamiliar:

1. Is it **just JS logic**?
   - Functions, loops, `await`, objects, arrays → your normal JS skills.
2. Or **TS-only metadata**?
   - `: Type`, `interface`, `type`, `public/private`, `A | B`, `<T>`.

TS-only bits don’t change runtime behavior; they:
- Document intent.
- Make VS Code smarter.
- Catch mistakes at compile time.

Use this sheet as a quick reminder while you read `src/` files.