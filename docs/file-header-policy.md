# Per-file source header policy

This repository is released under the [MIT License](../LICENSE) at the root. That license is the **binding** legal text. The headers below are a **short plain-language reminder** of what MIT allows and disclaims, so each source file makes the terms visible without opening `LICENSE`.

## What the MIT license means (summary)

- **You may** use, edit, redistribute, and **make money** from this code or from **your own changed versions** (including forks and proprietary products), as long as you keep the required copyright and license notices where MIT says you must.
- **Recipients do not owe** the copyright holders (contributors) fees, attribution beyond what the license requires, or any other obligation for exercising those rights.
- **No warranty, no liability:** the software is provided *as is*. The copyright holders are **not responsible** for the code, bugs, damages, or **what anyone does with the software** (see the full [LICENSE](../LICENSE)).

## Bulk application

The repository has license headers on existing first-party source files. To re-apply the same headers after the templates change, or to catch new file types, run from the repository root:

```bash
node scripts/apply-license-headers.mjs
```

## When to add a header

- **Add** the header to **new** first-party source files you create in this monorepo (or run the script above).
- **Add** the header when you **substantially rewrite** a file (treat the result as a new work for this purpose).
- **Optional** for tiny one-line or mechanical files (e.g. re-exports); use judgment.
- **Do not** add it to: generated code, `node_modules`, vendored third-party code, lockfiles, or content you do not have rights to relicense.

## What to put in the header

1. The **SPDX** license id line (machine-readable, used by many compliance tools).
2. The **copyright** line.
3. The **short permission / no-obligation / no-liability** block (use the matching template in [`license-headers/`](license-headers/)).

**Important:** The full MIT license text lives only in the root [LICENSE](../LICENSE) file. Do not paste the full MIT text into every source file; the short block plus SPDX is enough and keeps files readable.

## Comment style by file type

| Kind | First line(s) of file | Template |
|------|------------------------|----------|
| TypeScript, JavaScript, TSX, JSX, Vue SFC script | `//` or `/* */` | [`license-headers/typescript-javascript.txt`](license-headers/typescript-javascript.txt) |
| Python, shell, Ruby, `Dockerfile` | `#` | [`license-headers/hash-style.txt`](license-headers/hash-style.txt) |
| YAML (when comments are allowed) | `#` | same as hash-style |
| CSS | `/* */` | [`license-headers/css.txt`](license-headers/css.txt) |
| SQL | `--` | [`license-headers/sql.txt`](license-headers/sql.txt) |
| Markdown (optional) | `<!-- ... -->` at top | [`license-headers/markdown.txt`](license-headers/markdown.txt) |

If a file **must** start with something else first (e.g. `#!/usr/bin/env node`), put the shebang on line 1 and the header immediately **after** it.

## Copyright line

Use:

```text
Copyright (c) 2026 AgentOPsBase contributors
```

For files where **you** are the sole author and you want your name, you may use `Copyright (c) 2026 <Your Name>` instead, while still keeping `SPDX-License-Identifier: MIT` and the same permission/disclaimer block.

## Consistency

All workspace packages in this monorepo follow this policy; the legal terms are the same MIT license in the root [LICENSE](../LICENSE) file.
