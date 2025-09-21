import { UrlStorageReactRouterAdapter } from "@deivshon/url-storage-react-router-adapter"
import { lazy, useEffect } from "react"
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider, useNavigate } from "react-router"
import { StorePage } from "./pages/store"

const Redirect = ({ to }: { to: string }) => {
    const navigate = useNavigate()
    useEffect(() => {
        navigate(to, { replace: true })
    }, [])
    return null
}

const Heavy = lazy(() => import("./pages/heavy"))

const routes = (
    <>
        <Route
            element={
                <UrlStorageReactRouterAdapter>
                    <Outlet />
                </UrlStorageReactRouterAdapter>
            }
        >
            <Route path="/" element={<Redirect to="/store" />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/heavy" element={<Heavy />} />
            <Route
                path="*"
                element={
                    <h1 className="flex items-center justify-center h-screen text-9xl font-extrabold text-red-600 bg-black">
                        NOT FOUND
                    </h1>
                }
            />
        </Route>
    </>
)

const router = createBrowserRouter(createRoutesFromElements(routes))

export const App = () => <RouterProvider router={router} />
