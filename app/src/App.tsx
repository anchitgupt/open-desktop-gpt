import { invoke } from "@tauri-apps/api/core";
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SetupWizard } from "@/components/SetupWizard";
import type { AppConfig } from "@/lib/config-types";

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
	const [showWizard, setShowWizard] = useState(false);
	const [configLoaded, setConfigLoaded] = useState(false);

	useEffect(() => {
		invoke<AppConfig>("get_config")
			.then((config) => {
				if (!config.setup_completed) {
					setShowWizard(true);
				}
			})
			.catch(() => {
				// If config fetch fails, show wizard so the user can configure
				setShowWizard(true);
			})
			.finally(() => {
				setConfigLoaded(true);
			});
	}, []);

	if (!configLoaded) {
		return null;
	}

	return (
		<>
			{showWizard && (
				<SetupWizard onComplete={() => setShowWizard(false)} />
			)}
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
								<Suspense
									fallback={<div className="p-8">Loading Graph...</div>}
								>
									<Graph />
								</Suspense>
							}
						/>
					</Route>
				</Routes>
			</BrowserRouter>
		</>
	);
}

export default App;
