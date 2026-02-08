export const POSSIBLE_STATES = ['empty', 'upload_video', 'transcribe_video', 'complete', 'upload_error', 'transcribe_error'] as const;
export type PossibleState = typeof POSSIBLE_STATES[number];