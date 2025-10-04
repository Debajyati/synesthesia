import { FILTERS } from './constants';

export enum AppState {
    IDLE = 'IDLE',
    ANALYZING = 'ANALYZING',
    GENERATING = 'GENERATING',
    EDITING = 'EDITING',
    ERROR = 'ERROR'
}

export interface ImageData {
    id: number;
    base64: string;
    prompt: string;
}

export type FilterType = typeof FILTERS[number];

export type AspectRatio = "16:9" | "1:1" | "4:3" | "3:4" | "9:16";