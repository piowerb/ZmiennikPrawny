export type LegalActCategory = 'ustawa' | 'rozporzadzenie' | 'ogloszenie' | 'komunikat';

export interface LegalAct {
  id: string;
  title: string;
  category: LegalActCategory;
  journalNumber: string;
  year: number;
  position: number;
  publicationDate: string;
  effectiveDate?: string;
  issuingBody: string;
  summary: string;
  tags: string[];
  pdfUrl?: string;
  isNew: boolean;
}