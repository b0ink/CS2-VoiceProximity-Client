import { writable } from 'svelte/store';

interface TalkingIndicator {
  isTalking: boolean;
  volumePct: number;
  occlusionPct: number;
}

export const talkingIndicatorStore = writable<Map<string, TalkingIndicator>>(new Map());
