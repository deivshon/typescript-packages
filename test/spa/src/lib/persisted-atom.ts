import { createAtom } from "@deivshon/react-store"
import { number } from "@deivshon/serialization"
import { local } from "@deivshon/storage"
import { persistAtom } from "@deivshon/store-persist-middleware"

export const persistedAtom = createAtom(0, [persistAtom("persisted-atom", number, local(), { key: "atom-value" })])
