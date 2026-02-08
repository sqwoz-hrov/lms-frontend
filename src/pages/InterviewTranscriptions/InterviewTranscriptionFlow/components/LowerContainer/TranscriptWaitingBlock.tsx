import { Loader2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

type Quote = {
    text: string;
    link: string;
    source?: string;
}

const SQWOZ_QUOTES: Quote[] = [
    {
        text: "Распознавание видео — это как магия, которая превращает пиксели в слова. И да, иногда эта магия может занять пару секунд, особенно если видео длинное или качество не идеальное. Но не волнуйтесь, мы уже работаем над этим! 🚀",
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: "Мудрость SQWOZ"
    },
    {
        text: "Пока видео распознаётся, представьте, что у вас есть личный стенографист, который внимательно слушает каждое слово. Он может немного замолкать, когда видео сложное, но он обязательно выдаст вам точную расшифровку! 🎤",
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        source: "Секреты транскрипции"
    }
];

const QUOTE_INTERVAL_MS = 8000;
const TRANSITION_DURATION_MS = 300;

export function TranscriptWaitingBlock() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const goToQuote = useCallback((index: number) => {
        // Clear existing timers
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Transition to new quote
        setIsTransitioning(true);
        timeoutRef.current = setTimeout(() => {
            setCurrentIndex(index);
            setIsTransitioning(false);
        }, TRANSITION_DURATION_MS);

        // Restart auto-advance timer
        intervalRef.current = setInterval(() => {
            setIsTransitioning(true);
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % SQWOZ_QUOTES.length);
                setIsTransitioning(false);
            }, TRANSITION_DURATION_MS);
        }, QUOTE_INTERVAL_MS);
    }, []);

    const goToNext = useCallback(() => {
        const nextIndex = (currentIndex + 1) % SQWOZ_QUOTES.length;
        goToQuote(nextIndex);
    }, [currentIndex, goToQuote]);

    const goToPrev = useCallback(() => {
        const prevIndex = (currentIndex - 1 + SQWOZ_QUOTES.length) % SQWOZ_QUOTES.length;
        goToQuote(prevIndex);
    }, [currentIndex, goToQuote]);

    // Initial auto-advance setup
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setIsTransitioning(true);
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % SQWOZ_QUOTES.length);
                setIsTransitioning(false);
            }, TRANSITION_DURATION_MS);
        }, QUOTE_INTERVAL_MS);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const currentQuote = SQWOZ_QUOTES[currentIndex];

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-12 px-4">
            {/* Loader */}
            <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xl font-medium">Идёт распознавание...</span>
            </div>

            {/* Quote carousel */}
            <div className="max-w-2xl w-full">
                <div className="relative flex items-center gap-2">
                    {/* Previous button */}
                    <button
                        onClick={goToPrev}
                        className="shrink-0 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Предыдущая цитата"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    {/* Quote card */}
                    <div
                        className={[
                            "flex-1 rounded-2xl bg-muted/50 p-6 transition-opacity duration-300",
                            isTransitioning ? "opacity-0" : "opacity-100"
                        ].join(" ")}
                    >
                        {/* Quote text */}
                        <p className="text-lg text-center text-muted-foreground leading-relaxed">
                            "{currentQuote.text}"
                        </p>

                        {/* Source link */}
                        <div className="mt-4 flex justify-center">
                            <a
                                href={currentQuote.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-primary/70 hover:text-primary transition-colors"
                            >
                                <span>{currentQuote.source ?? "Источник"}</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* Next button */}
                    <button
                        onClick={goToNext}
                        className="shrink-0 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Следующая цитата"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {/* Dots indicator */}
                <div className="flex justify-center gap-2 mt-4">
                    {SQWOZ_QUOTES.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToQuote(index)}
                            className={[
                                "h-2 rounded-full transition-all duration-300",
                                index === currentIndex
                                    ? "w-6 bg-primary"
                                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                            ].join(" ")}
                            aria-label={`Цитата ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}