import { type CSSProperties, useMemo } from "react";

const DECOY_COUNT = 9;
const LATIN_LETTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
const CYRILLIC_LETTERS = Array.from("АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя");
const SHARED_SYMBOLS = Array.from("0123456789_@#!?%&*+-=<>$");

type CharacterReel = {
	character: string;
	symbols: string[];
};

function getDecoyPool(character: string) {
	if (/\p{Script=Cyrillic}/u.test(character)) return [...CYRILLIC_LETTERS, ...SHARED_SYMBOLS];
	if (/\p{Script=Latin}/u.test(character)) return [...LATIN_LETTERS, ...SHARED_SYMBOLS];
	return SHARED_SYMBOLS;
}

function createDecoys(character: string) {
	const candidates = getDecoyPool(character).filter(symbol => symbol !== character);

	for (let index = candidates.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[candidates[index], candidates[randomIndex]] = [candidates[randomIndex], candidates[index]];
	}

	return candidates.slice(0, DECOY_COUNT);
}

function createCharacterReels(text: string): CharacterReel[] {
	return Array.from(text, character => ({
		character,
		symbols: /\s/u.test(character) ? [character] : [...createDecoys(character), character],
	}));
}

export function SpinningText({ text }: { text: string }) {
	const reels = useMemo(() => createCharacterReels(text), [text]);

	return (
		<span className="whitespace-nowrap">
			<span className="sr-only">{text}</span>
			<span key={text} aria-hidden="true">
				{reels.map(({ character, symbols }, index) => {
					if (/\s/u.test(character)) {
						return <span key={`${index}-space`}>&nbsp;</span>;
					}

					const animationStyle: CSSProperties = {
						animationDelay: `${Math.min(index * 45, 450)}ms`,
						animationDuration: `${1100 + (index % 3) * 100}ms`,
					};

					return (
						<span key={`${index}-${character}`} className="character-reel-window">
							<span className="character-reel-sizer">{character}</span>
							<span className="character-reel-viewport">
								<span className="character-reel-track" style={animationStyle}>
									{symbols.map((symbol, symbolIndex) => (
										<span key={`${symbolIndex}-${symbol}`} className="character-reel-symbol">
											{symbol}
										</span>
									))}
								</span>
							</span>
						</span>
					);
				})}
			</span>
		</span>
	);
}
