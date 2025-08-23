import { spawn } from "child_process"
import { sortBy } from "es-toolkit"
import * as esbuild from "esbuild"
import { readFile, stat, writeFile } from "fs/promises"
import path from "path"
import { promisify } from "util"
import * as zlib from "zlib"
import { computePackages, type Package } from "./packages.ts"

const main = async () => {
    const packages = computePackages()

    const leftToBuild = new Set(packages.map((pkg) => pkg.name))
    const built = new Set<Package>()

    const sizes = new Map<Package, { esm: PackageSize; cjs: PackageSize }>()

    while (leftToBuild.size > 0) {
        const buildable = packages.filter(
            (pkg) =>
                leftToBuild.has(pkg.name) &&
                pkg.workspaceDependencies.every((dependency) => !leftToBuild.has(dependency)),
        )
        if (buildable.length === 0) {
            throw new Error("no buildable packages but some packages are not built yet")
        }

        await Promise.all(
            buildable.map(
                (pkg) =>
                    new Promise<null>((resolve) => {
                        const child = spawn("pnpm", ["-C", pkg.path, "build"])

                        child.stdout.on("data", log(`[${pkg.name}]`, "stdout"))
                        child.stderr.on("data", log(`[${pkg.name}]`, "stderr"))

                        child.on("close", () => {
                            resolve(null)
                        })
                    }),
            ),
        )

        for (const pkg of buildable) {
            leftToBuild.delete(pkg.name)
            built.add(pkg)
        }
    }

    await Promise.all(
        Array.from(built).map(async (pkg) => {
            const dist = path.join(pkg.path, "dist")

            const baseEsm = path.join(dist, "index.js")
            const baseCjs = path.join(dist, "index.cjs")
            const minifiedEsm = path.join(dist, "index.min.js")
            const minifiedCjs = path.join(dist, "index.min.cjs")
            const gzippedEsm = path.join(dist, "index.min.js.gz")
            const gzippedCjs = path.join(dist, "index.min.cjs.gz")

            const baseEsmCode = await readFile(baseEsm)
            const baseCjsCode = await readFile(baseCjs)
            const { code: minifiedEsmCode } = await esbuild.transform(baseEsmCode, { minify: true })
            const { code: minifiedCjsCode } = await esbuild.transform(baseCjsCode, { minify: true })
            const gzippedEsmCode = await gzip(minifiedEsmCode)
            const gzippedCjsCode = await gzip(minifiedCjsCode)

            await writeFile(minifiedEsm, minifiedEsmCode)
            await writeFile(minifiedCjs, minifiedCjsCode)
            await writeFile(gzippedEsm, gzippedEsmCode)
            await writeFile(gzippedCjs, gzippedCjsCode)

            const { size: minifiedEsmSize } = await stat(minifiedEsm)
            const { size: minifiedCjsSize } = await stat(minifiedCjs)
            const { size: gzippedEsmSize } = await stat(gzippedEsm)
            const { size: gzippedCjsSize } = await stat(gzippedCjs)

            sizes.set(pkg, {
                cjs: {
                    minified: minifiedCjsSize,
                    gzipped: gzippedCjsSize,
                },
                esm: {
                    minified: minifiedEsmSize,
                    gzipped: gzippedEsmSize,
                },
            })
        }),
    )

    console.log("\n")
    for (const [pkg, size] of sortBy(Array.from(sizes.entries()), [(value) => value[0].name])) {
        if (pkg.isBuildPackage) {
            continue
        }

        console.log(
            `esm: ${formatBytes(size.esm.minified).padEnd(7, " ")}\tesm/gz: ${formatBytes(size.esm.gzipped).padEnd(7, " ")}\tcjs: ${formatBytes(size.cjs.minified).padEnd(7, " ")}\tcjs/gz: ${formatBytes(size.cjs.gzipped).padEnd(7, " ")} <- ${colored(`[${pkg.name}]`)}`,
        )
    }
}

const gzip = promisify(zlib.gzip)

type PackageSize = {
    minified: number
    gzipped: number
}

const formatBytes = (bytes: number): string => {
    let number = bytes
    let count = 0

    const prefixes = ["B", "KiB", "MiB", "GiB"]
    while (number > 1024 || count >= prefixes.length - 1) {
        number /= 1024
        count++
    }

    return `${count === 0 ? number : number.toFixed(2)}${prefixes.at(count)}`
}

const colored = (() => {
    const reset = "\x1b[0m"
    const colors = ["\x1b[31m", "\x1b[32m", "\x1b[33m", "\x1b[34m", "\x1b[35m", "\x1b[36m"]

    return (string: string): string => {
        let charactersSum = 0
        for (let idx = 0; idx < string.length; idx++) {
            const charCode = string.charCodeAt(idx)
            if (isNaN(charCode)) {
                continue
            }

            charactersSum += charCode + idx
        }

        const hashedColor = colors.at(charactersSum % colors.length) ?? colors[0]
        return `${hashedColor}${string}${reset}`
    }
})()
const uncolored = (string: string): string => string.replace(/\x1b\[[0-9;]*m/g, "")

const log = (prefix: string, mode: "stdout" | "stderr") => (data: unknown) => {
    const coloredPrefix = colored(prefix)
    const string: string | null = (() => {
        if (!(data instanceof Buffer)) {
            return null
        }

        try {
            return data.toString()
        } catch {
            return null
        }
    })()
    if (!string) {
        if (mode === "stdout") {
            console.log(coloredPrefix, data)
        } else {
            console.error(coloredPrefix, data)
        }
        return
    }

    const write =
        mode === "stdout" ? process.stdout.write.bind(process.stdout) : process.stderr.write.bind(process.stderr)
    for (const line of string.trimEnd().split("\n")) {
        write(`${coloredPrefix}: ${uncolored(line)}\n`)
    }
}

main()
