declare module 'expo-print' {
  export interface PrintOptions {
    html: string;
    base64?: boolean;
    width?: number;
    height?: number;
    printerUrl?: string;
  }

  export interface PrintFileOptions {
    html: string;
    base64?: boolean;
    width?: number;
    height?: number;
  }

  export interface PrintResult {
    uri: string;
  }

  export function printAsync(options: PrintOptions): Promise<void>;
  export function printToFileAsync(options: PrintFileOptions): Promise<PrintResult>;
}