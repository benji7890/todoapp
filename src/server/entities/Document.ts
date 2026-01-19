import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { DOCUMENT_STATUS, DocumentStatus } from '../../shared/documents';

@Entity()
export class Document {
  @PrimaryKey()
  id?: number;

  @Property()
  filename: string;

  @Property()
  fileSize: number;

  @Property()
  mimeType: string;

  @Property()
  uploadedAt: Date;

  @Property()
  status: string;

  constructor(params: { filename: string; fileSize: number; mimeType: string; status?: DocumentStatus }) {
    this.filename = params.filename;
    this.fileSize = params.fileSize;
    this.mimeType = params.mimeType;
    this.uploadedAt = new Date();
    this.status = params.status ?? DOCUMENT_STATUS.UPLOADING;
  }
}
