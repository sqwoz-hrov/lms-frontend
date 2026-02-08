import { useVideoUpload, VideoUploadInput } from "@/components/video";
import { UploadIcon } from "lucide-react";

export function VideoPlayerPlaceholder({ upload }: { upload: ReturnType<typeof useVideoUpload> }) {
    return (
		<VideoUploadInput
			state={upload}
			onFileSelect={upload.setFile}
			onStartUpload={upload.startUpload}
			onCancel={upload.cancelUpload}
			onReset={upload.reset}
			autoUpload={true}
			helpText={upload.mockMode ? "🧪 Режим тестирования — загрузка симулируется" : undefined}
            className="bg-muted"
		/>
    );
}