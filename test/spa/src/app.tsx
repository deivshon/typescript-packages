import { UrlStorageReactRouterAdapter } from "@deivshon/url-storage-react-router-adapter"
import { lazy } from "react"
import { createBrowserRouter, createRoutesFromElements, Outlet, Route, RouterProvider } from "react-router"
import { RootPage } from "./pages/root"

const Page1 = lazy(() => import("./pages/page-1"))

const routes = (
    <>
        <Route
            element={
                <UrlStorageReactRouterAdapter>
                    <Outlet />
                </UrlStorageReactRouterAdapter>
            }
        >
            <Route path="/" element={<RootPage />} />
            <Route path="/page-1" element={<Page1 />} />
            <Route
                path="*"
                element={
                    <h1
                        style={{
                            width: "100dvw",
                            display: "flex",
                            justifyContent: "center",
                            fontSize: "3rem",
                        }}
                    >
                        NOT FOUND
                    </h1>
                }
            />
        </Route>
    </>
)

const router = createBrowserRouter(createRoutesFromElements(routes))

export const App = () => <RouterProvider router={router} />
