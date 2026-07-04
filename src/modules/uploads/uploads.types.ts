export interface UploadImageOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
}
