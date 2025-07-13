import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router"
import { RootPage } from "./pages/root"

const routes = (
    <>
        <Route path="/" element={<RootPage />} />
    </>
)

const router = createBrowserRouter(createRoutesFromElements(routes))

export const App = () => <RouterProvider router={router} />
