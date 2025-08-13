import { setUrlStorageControls, syncUrlStorage } from "@deivshon/react-store/persist"
import { useLayoutEffect, type ReactNode } from "react"
import { useSearchParams } from "react-router"

type UrlPersistProvider = {
    children?: ReactNode
}

// FIXME separate this into own react router adapter package
export const UrlPersistProvider = ({ children }: UrlPersistProvider) => {
    const [searchParams, setSearchParams] = useSearchParams()

    useLayoutEffect(() => {
        const current = Array.from(searchParams.entries())

        setUrlStorageControls({
            get: () => current,
            set: (updatedEntries, opts) => {
                const updatedEntriesKeys = new Set(updatedEntries.map(([key]) => key))

                setSearchParams([...updatedEntries, ...current.filter(([key]) => !updatedEntriesKeys.has(key))], {
                    replace: opts.replace,
                })
            },
        })

        syncUrlStorage()

        return () => {
            setUrlStorageControls(null)
        }
    }, [searchParams, setSearchParams])

    return <>{children}</>
}
