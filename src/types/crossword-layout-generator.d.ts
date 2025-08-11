declare module 'crossword-layout-generator' {
  export interface LayoutWord {
    clue?: string;
    answer: string;
    startx?: number;
    starty?: number;
    position?: number;
    orientation?: 'across' | 'down' | 'none';
  }

  export interface Layout {
    rows: number;
    cols: number;
    table: string[][];
    table_string: string;
    result: LayoutWord[];
  }

  export function generateLayout(words: LayoutWord[]): Layout;
}

