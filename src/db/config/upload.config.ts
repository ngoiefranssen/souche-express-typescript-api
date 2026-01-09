import { FileUploadConfig } from "../../utils/form_data_parser";

export const UPLOAD_CONFIGS = {
  PROFILE_PHOTO: {
    fieldName: 'profile_photo',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    maxSize: 5 * 1024 * 1024, // 5MB
    destination: 'public/uploads/profiles',
  } as FileUploadConfig,

  DOCUMENT: {
    fieldName: 'document',
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024, // 10MB
    destination: 'public/uploads/documents',
  } as FileUploadConfig,

  INVOICE: {
    fieldName: 'invoice',
    allowedMimeTypes: ['application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB
    destination: 'public/uploads/invoices',
  } as FileUploadConfig,
};