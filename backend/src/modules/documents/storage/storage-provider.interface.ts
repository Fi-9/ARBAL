/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StorageProvider {
  /**
   * Uploads a file buffer and returns the storage path/identifier.
   */
  upload(fileId: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Downloads and returns the file buffer.
   */
  download(fileId: string): Promise<Buffer>;

  /**
   * Deletes a file from storage.
   */
  delete(fileId: string): Promise<void>;
}
