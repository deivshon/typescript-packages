import { AsyncNamedStorage } from "./storage"
import { valueFromStorage } from "./utils"

// TODO error handling
export const idb: AsyncNamedStorage = {
    async: true,
    type: "named",
    get: async (name) => {
        const database = await getIndexedDbDatabase()
        const request: IDBRequest<unknown> = database
            .transaction(objectStoreName, "readonly")
            .objectStore(objectStoreName)
            .get(name)

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve(valueFromStorage(request.result))
            }
            request.onerror = () => {
                reject(new Error())
            }
        })
    },
    set: async (name, value) => {
        const database = await getIndexedDbDatabase()
        const request = database.transaction(objectStoreName, "readwrite").objectStore(objectStoreName).put(value, name)

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                resolve()
            }
            request.onerror = () => {
                reject(new Error())
            }
        })
    },
}

const databaseName = "@deivshon/storage"
const objectStoreName = "root"
const getIndexedDbDatabase = (() => {
    let database: IDBDatabase | null = null

    return (): Promise<IDBDatabase> => {
        if (database) {
            return Promise.resolve(database)
        }

        const request = indexedDB.open(databaseName)

        request.onupgradeneeded = () => {
            request.result.createObjectStore(objectStoreName)
        }

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                database = request.result
                resolve(database)
            }
            request.onerror = () => {
                reject(new Error())
            }
        })
    }
})()
