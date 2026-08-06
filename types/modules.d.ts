declare module 'pdf-parse' {
  export interface LoadParameters {
    data?: string | number[] | ArrayBuffer | any;
    password?: string;
    verbosity?: number;
  }
  export interface PageTextResult {
    num: number;
    text: string;
  }
  export interface TextResult {
    pages: PageTextResult[];
    text: string;
    total: number;
  }
  export class PDFParse {
    constructor(options: LoadParameters);
    getText(): Promise<TextResult>;
    destroy(): Promise<void>;
  }
}

declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(options: { buffer: Buffer }): Promise<MammothResult>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<MammothResult>;
}
