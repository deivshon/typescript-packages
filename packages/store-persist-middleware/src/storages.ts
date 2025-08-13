import { local as $local, session as $session, url as $url, UrlStorageOptions } from "@deivshon/storage"
import { StoragePersistence } from "./persist"

export const persistLocal = (): StoragePersistence => ({
    storage: $local,
    options: {},
})
export const persistSession = (): StoragePersistence => ({
    storage: $session,
    options: {},
})
export const persistUrl = (options: UrlStorageOptions = {}): StoragePersistence => ({ storage: $url, options })
