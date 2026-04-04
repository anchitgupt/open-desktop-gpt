import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";

const Dashboard = lazy(() =>
	import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Reader = lazy(() =>
	import("@/pages/Reader").then((m) => ({ default: m.Reader })),
);
const QA = lazy(() => import("@/pages/QA").then((m) => ({ default: m.QA })));
const Graph = lazy(() =>
	import("@/pages/Graph").then((m) => ({ default: m.Graph })),
);

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<Layout />}>
					<Route
						path="/"
						element={
							<Suspense
								fallback={<div className="p-8">Loading Dashboard...</div>}
							>
								<Dashboard />
							</Suspense>
						}
					/>
					<Route
						path="/wiki/:slug"
						element={
							<Suspense
								fallback={<div className="p-8">Loading Article...</div>}
							>
								<Reader />
							</Suspense>
						}
					/>
					<Route
						path="/qa"
						element={
							<Suspense fallback={<div className="p-8">Loading Q&A...</div>}>
								<QA />
							</Suspense>
						}
					/>
					<Route
						path="/graph"
						element={
							<Suspense fallback={<div className="p-8">Loading Graph...</div>}>
								<Graph />
							</Suspense>
						}
					/>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
