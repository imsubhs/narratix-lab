/**
 * Stage 8B — Professional Export System public surface.
 *
 * Import everything export-related from '@/lib/export'. Consumers should only
 * ever need the ExportService functions and the type definitions.
 */
export {
  getSupportedFormats,
  isSupportedFormat,
  estimateFileSize,
  generateExport,
  exportReport,
} from './export-service';
export { buildReportModel, DEMO_DISCLAIMER } from './report-model';
export type {
  ExportContext,
  ExportFormatDescriptor,
  ExportFormatId,
  RenderedExport,
  ReportModel,
  ReportSection,
  ReportBlock,
} from './types';
