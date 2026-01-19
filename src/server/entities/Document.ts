import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { DOCUMENT_STATUS, DocumentStatus, AllowedMimeType } from '../../shared/documents';

@Entity()
export class Document {
  @PrimaryKey()
  id?: number;

  @Property()
  filename: string;

  @Property()
  fileSize: number;

  @Property()
  mimeType: AllowedMimeType;

  @Property()
  uploadedAt: Date;

  @Property()
  status: DocumentStatus;

  constructor(params: { filename: string; fileSize: number; mimeType: AllowedMimeType; status?: DocumentStatus }) {
    this.filename = params.filename;
    this.fileSize = params.fileSize;
    this.mimeType = params.mimeType;
    this.uploadedAt = new Date();
    this.status = params.status ?? DOCUMENT_STATUS.UPLOADING;
  }
}
