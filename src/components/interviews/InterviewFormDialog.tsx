// src/components/hr/interviews/InterviewFormDialog.tsx
import type { BaseHrConnectionDto } from "@/api/hrConnectionsApi";
import { InterviewApi, type InterviewType } from "@/api/interviewsApi"; // ← singular
import { VideosApi } from "@/api/videosApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function InterviewFormDialog({
	open,
	onOpenChange,
	hrConnection,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	hrConnection: BaseHrConnectionDto;
}) {
	const qc = useQueryClient();
	const { register, handleSubmit, setValue, watch } = useForm<{ name: string; type: InterviewType }>({
		defaultValues: { name: "", type: "screening" },
	});

	const [file, setFile] = useState<File | null>(null);
	const [progress, setProgress] = useState<number | null>(null);

	const m = useMutation({
		mutationFn: async (v: { name: string; type: InterviewType }) => {
			let videoId: string | undefined = undefined;
			if (file) {
				const uploaded = await VideosApi.upload(file, {
					onUploadProgress: evt => {
						if (!evt.total) return;
						setProgress(Math.round((evt.loaded / evt.total) * 100));
					},
				});
				videoId = uploaded.id;
			}
			return InterviewApi.create({ hr_connection_id: hrConnection.id, name: v.name, type: v.type, video_id: videoId });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["interviews", { hr_connection_id: hrConnection.id }] });
			onOpenChange(false);
		},
		onSettled: () => setProgress(null),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Новое интервью</DialogTitle>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit(v => m.mutate(v))}>
					<div className="grid gap-2">
						<Label htmlFor="name">Название</Label>
						<Input id="name" placeholder="Техническое интервью #1" {...register("name", { required: true })} />
					</div>

					<div className="grid gap-2">
						<Label>Тип</Label>
						<Select defaultValue={watch("type")} onValueChange={(v: InterviewType) => setValue("type", v)}>
							<SelectTrigger>
								<SelectValue placeholder="Тип" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="screening">Screening</SelectItem>
								<SelectItem value="technical_interview">Technical</SelectItem>
								<SelectItem value="final">Final</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="video">Видео (необязательно)</Label>
						<Input id="video" type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
						{typeof progress === "number" && <div className="text-xs text-muted-foreground">Загрузка: {progress}%</div>}
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Отмена
						</Button>
						<Button type="submit" disabled={m.isPending}>
							{m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Создать
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
