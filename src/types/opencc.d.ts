declare module 'opencc-js' {
  interface ConverterOptions {
    from?: string;
    to?: string;
  }

  export class Converter {
    constructor(options: ConverterOptions);
    convert(text: string): string;
  }

  export function convert(text: string, options: ConverterOptions): string;
}