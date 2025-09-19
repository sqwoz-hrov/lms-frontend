// src/components/common/Loader.tsx
import { Loader2 } from "lucide-react";

export function Loader() {
	return (
		<div className="flex items-center justify-center p-6">
			<Loader2 className="animate-spin h-6 w-6 text-gray-600" />
		</div>
	);
}
