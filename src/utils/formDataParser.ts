import { Request } from 'express';
import { UploadedFile } from 'express-fileupload';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

/**
 * Configuration for file upload
 */
export interface FileUploadConfig {
  fieldName: string;
  allowedMimeTypes: string[];
  maxSize: number; // in bytes
  destination: string;
}

/**
 * Result of file upload processing
 */
export interface FileUploadResult {
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

/**
 * Parse FormData body and convert types appropriately
 * 
 * @param body - Request body from express
 * @param typeConfig - Configuration for type conversion (optional)
 * @returns Parsed object with proper types
 */
export const parseFormDataBody = (
  body: any,
  typeConfig?: {
    numeric?: string[];
    boolean?: string[];
    date?: string[];
  }
): Record<string, any> => {
  const parsed: Record<string, any> = {};

  for (const key in body) {
    const value = body[key];

    // Skip undefined or empty string values
    if (value === undefined || value === '') continue;

    // Handle explicit null
    if (value === 'null' || value === null) {
      parsed[key] = null;
      continue;
    }

    // Parse numeric fields
    if (typeConfig?.numeric?.includes(key)) {
      const numValue = Number(value);
      parsed[key] = isNaN(numValue) ? null : numValue;
      continue;
    }

    // Parse boolean fields
    if (typeConfig?.boolean?.includes(key)) {
      parsed[key] = value === 'true' || value === true;
      continue;
    }

    // Parse date fields
    if (typeConfig?.date?.includes(key)) {
      const date = new Date(value);
      parsed[key] = isNaN(date.getTime()) ? null : value;
      continue;
    }

    // Default: keep as string
    parsed[key] = value;
  }

  return parsed;
};

/**
 * Process file upload from express-fileupload
 * Works with both useTempFiles: true and useTempFiles: false
 * 
 * @param req - Express request object
 * @param config - File upload configuration
 * @returns File upload result or null if no file
 * 
 * @example
 * const uploadConfig: FileUploadConfig = {
 *   fieldName: 'profile_photo',
 *   allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   destination: 'public/uploads/profiles'
 * };
 * 
 * const file = await processFileUpload(req, uploadConfig);
 * if (file) {
 *   user.profilePhoto = file.url;
 * }
 */
export const processFileUpload = async (
  req: Request,
  config: FileUploadConfig
): Promise<FileUploadResult | null> => {
  // Check if files exist
  if (!req.files || !req.files[config.fieldName]) {
    return null;
  }

  const file = req.files[config.fieldName] as UploadedFile;

  // Validate MIME type
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`
    );
  }

  // Validate file size
  if (file.size > config.maxSize) {
    throw new Error(
      `File too large. Maximum size: ${(config.maxSize / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Generate unique filename
  const fileExtension = path.extname(file.name);
  const uniqueFilename = `${uuidv4()}${fileExtension}`;
  const uploadPath = path.join(config.destination, uniqueFilename);

  // Ensure directory exists
  await fs.mkdir(config.destination, { recursive: true });

  // Handle both useTempFiles modes
  if (file.tempFilePath) {
    // useTempFiles: true - copy from temp location
    await fs.copyFile(file.tempFilePath, uploadPath);
    // Clean up temp file
    try {
      await fs.unlink(file.tempFilePath);
    } catch (err) {
      console.warn('Failed to delete temp file:', err);
    }
  } else {
    // useTempFiles: false - use mv() method
    await file.mv(uploadPath);
  }

  return {
    filename: uniqueFilename,
    path: uploadPath,
    url: `/${config.destination}/${uniqueFilename}`,
    mimetype: file.mimetype,
    size: file.size,
  };
};

/**
 * Process multiple file uploads
 * 
 * @param req - Express request object
 * @param config - File upload configuration
 * @returns Array of file upload results
 */
export const processMultipleFileUploads = async (
  req: Request,
  config: FileUploadConfig
): Promise<FileUploadResult[]> => {
  if (!req.files || !req.files[config.fieldName]) {
    return [];
  }

  const files = Array.isArray(req.files[config.fieldName])
    ? req.files[config.fieldName]
    : [req.files[config.fieldName]];

  const results: FileUploadResult[] = [];

  for (const file of files as UploadedFile[]) {
    // Validate MIME type
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type for ${file.name}. Allowed types: ${config.allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > config.maxSize) {
      throw new Error(
        `File ${file.name} too large. Maximum size: ${(config.maxSize / (1024 * 1024)).toFixed(2)}MB`
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join(config.destination, uniqueFilename);

    // Ensure directory exists
    await fs.mkdir(config.destination, { recursive: true });

    // Handle both useTempFiles modes
    if (file.tempFilePath) {
      // useTempFiles: true - copy from temp location
      await fs.copyFile(file.tempFilePath, uploadPath);
      // Clean up temp file
      try {
        await fs.unlink(file.tempFilePath);
      } catch (err) {
        console.warn('Failed to delete temp file:', err);
      }
    } else {
      // useTempFiles: false - use mv() method
      await file.mv(uploadPath);
    }

    results.push({
      filename: uniqueFilename,
      path: uploadPath,
      url: `/${config.destination}/${uniqueFilename}`,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  return results;
};

/**
 * Delete uploaded file
 * 
 * @param filePath - Path to file to delete
 */
export const deleteUploadedFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File doesn't exist or already deleted
    console.warn(`Failed to delete file ${filePath}:`, error);
  }
};

/**
 * Validate and sanitize filename
 * 
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};