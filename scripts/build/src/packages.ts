import { uniq } from "es-toolkit"
import { readdirSync, readFileSync } from "fs"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
import { z } from "zod"

export type Package = {
    name: string
    path: string
    workspaceDependencies: string[]
}

export const computePackages = (): Package[] => {
    const packages: Package[] = []

    const rootPackagesDirectory = path.join(fileURLToPath(import.meta.url), "..", "..", "..", "..", "packages")
    const packagesDirectories = readdirSync(rootPackagesDirectory, { withFileTypes: true })
        .filter((file) => file.isDirectory())
        .map((directory) => path.join(rootPackagesDirectory, directory.name))

    for (const packageDirectory of packagesDirectories) {
        const packageJsonFile = readdirSync(packageDirectory, { withFileTypes: true })
            .filter((file) => file.isFile() && file.name === "package.json")
            .map((file) => path.join(packageDirectory, file.name))
            .at(0)
        if (!packageJsonFile) {
            continue
        }

        const rawPackageJson: unknown = (() => {
            try {
                return JSON.parse(readFileSync(packageJsonFile, { encoding: "utf-8" }))
            } catch (error) {
                console.error(`could not parse package json \`${packageJsonFile}\`: ${error}`)
                return null
            }
        })()
        if (!rawPackageJson) {
            continue
        }

        const packageJsonParsing = packageJsonSchema.safeParse(rawPackageJson)
        if (!packageJsonParsing.success) {
            console.error(`package json \`${packageJsonFile}\` does not match the schema: ${packageJsonParsing.error}`)
            continue
        }
        const packageJson = packageJsonParsing.data

        const workspaceOnlyPackageName = (entry: [string, string]) =>
            entry[1].startsWith("workspace:") ? entry[0] : null

        packages.push({
            name: packageJson.name,
            path: dirname(packageJsonFile),
            workspaceDependencies: uniq(
                [
                    ...Object.entries(packageJson.peerDependencies).map(workspaceOnlyPackageName),
                    ...Object.entries(packageJson.dependencies).map(workspaceOnlyPackageName),
                    ...Object.entries(packageJson.devDependencies).map(workspaceOnlyPackageName),
                ].filter((dependency) => typeof dependency === "string"),
            ),
        })
    }

    return packages
}

const packageJsonSchema = z.object({
    name: z.string(),
    dependencies: z.record(z.string(), z.string()).default({}),
    devDependencies: z.record(z.string(), z.string()).default({}),
    peerDependencies: z.record(z.string(), z.string()).default({}),
})
