import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";

export function Layout() {
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// Don't intercept when user is typing in an input/textarea
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}

			if (!(e.metaKey || e.ctrlKey)) return;

			switch (e.key) {
				case "/":
					e.preventDefault();
					navigate("/qa");
					break;
				case "d":
					e.preventDefault();
					navigate("/");
					break;
				case "g":
					e.preventDefault();
					navigate("/graph");
					break;
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);

	return (
		<div className="flex h-screen bg-background text-foreground">
			<Sidebar />
			<main
				key={location.pathname}
				className="flex-1 overflow-auto animate-in fade-in duration-200"
			>
				<Outlet />
			</main>
			<CommandPalette />
		</div>
	);
}
