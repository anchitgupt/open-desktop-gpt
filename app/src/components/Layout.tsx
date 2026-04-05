import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
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
				case "i":
					e.preventDefault();
					navigate("/inbox");
					break;
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);

	return (
		<div className="flex h-screen bg-background text-foreground">
			<Sidebar />
			<AnimatePresence mode="wait">
				<motion.main
					key={location.pathname}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
					className="flex-1 overflow-auto"
				>
					<Outlet />
				</motion.main>
			</AnimatePresence>
			<CommandPalette />
		</div>
	);
}
