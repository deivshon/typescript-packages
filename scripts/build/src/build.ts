import { spawn } from "child_process"
import { computePackages } from "./packages.ts"

const main = async () => {
    const packages = computePackages()

    const leftToBuild = new Set(packages.map((pkg) => pkg.name))
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
        }
    }
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
