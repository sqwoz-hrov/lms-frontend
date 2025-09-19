// src/components/subjects/SubjectCard.tsx
import { cn } from "@/lib/utils";

type Subject = {
	id: string;
	name: string;
	color_code: string; // HEX, например "#3b82f6"
};

type Props = {
	subject: Subject;
	onClick?: () => void;
	isAdmin?: boolean;
};

export function SubjectCard({ subject, onClick, isAdmin = false }: Props) {
	return (
		<div
			onClick={onClick}
			className={cn(
				"rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden",
				"hover:scale-[1.01] active:scale-[0.99]",
			)}
		>
			{/* Цветовая полоска сверху */}
			<div className="h-1 w-full" style={{ backgroundColor: subject.color_code }} />

			{/* Контент */}
			<div className="p-5 flex items-center justify-between">
				<div className="flex items-center gap-4">
					{/* Квадрат с цветом и текстовой иконкой */}
					<div
						className="w-12 h-12 flex items-center justify-center rounded-lg text-xl font-bold"
						style={{
							backgroundColor: `${subject.color_code}20`, // прозрачный фон
							color: subject.color_code,
						}}
					>
						📚
					</div>

					<div>
						<h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
						<p className="text-sm text-gray-500">
							{isAdmin ? "Нажмите, чтобы управлять" : "Нажмите, чтобы посмотреть материалы"}
						</p>
					</div>
				</div>

				{/* Простая стрелочка → без сторонних иконок */}
				<span className="text-gray-400 group-hover:text-gray-600 transition-colors text-xl">→</span>
			</div>
		</div>
	);
}
