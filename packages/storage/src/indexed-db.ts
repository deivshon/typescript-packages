import { AsyncNamedStorage, AsyncNamedStorageInstance } from "./storage"
import { valueFromStorage } from "./utils"

const $idb: AsyncNamedStorage = {
    async: true,
    type: "named",
    get: async (name) => {
        const database = await getIndexedDbDatabase()
        if (!database) {
            return {}
        }

        const request: IDBRequest<unknown> = database
            .transaction(objectStoreName, "readonly")
            .objectStore(objectStoreName)
            .get(name)

        return new Promise((resolve) => {
            request.onsuccess = () => {
                resolve(valueFromStorage(request.result))
            }
            request.onerror = () => {
                resolve({})
            }
        })
    },
    replace: async (name, value) => {
        const database = await getIndexedDbDatabase()
        if (!database) {
            return
        }

        const request = database.transaction(objectStoreName, "readwrite").objectStore(objectStoreName).put(value, name)

        return new Promise((resolve) => {
            request.onsuccess = request.onerror = () => {
                resolve()
            }
        })
    },
    update: async (name, value, options) => {
        const current = await $idb.get(name)
        const updated = { ...current, ...value }
        return $idb.replace(name, updated, options)
    },
}
export const idb = (): AsyncNamedStorageInstance => ({
    storage: $idb,
    options: {},
})

const databaseName = "@deivshon/storage"
const objectStoreName = "root"
const getIndexedDbDatabase = (() => {
    let database: IDBDatabase | null = null

    return (): Promise<IDBDatabase | null> => {
        if (database) {
            return Promise.resolve(database)
        }

        const request = indexedDB.open(databaseName)

        request.onupgradeneeded = () => {
            request.result.createObjectStore(objectStoreName)
        }

        return new Promise((resolve) => {
            request.onsuccess = () => {
                database = request.result
                resolve(database)
            }
            request.onerror = () => {
                resolve(null)
            }
        })
    }
})()
