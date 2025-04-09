declare module 'expo-sharing' {
  export interface SharingOptions {
    dialogTitle?: string;
    UTI?: string;
    mimeType?: string;
    email?: string;
    subject?: string;
  }

  export function shareAsync(url: string, options?: SharingOptions): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}