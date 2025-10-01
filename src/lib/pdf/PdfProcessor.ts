import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for Vite compatibility
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export interface PdfProcessingProgress {
  stage: 'loading' | 'parsing' | 'extracting' | 'complete';
  pagesCurrent: number;
  pagesTotal: number;
  message: string;
}

export class PdfProcessor {
  private onProgress?: (progress: PdfProcessingProgress) => void;

  constructor(onProgress?: (progress: PdfProcessingProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Extract clean text from a PDF file
   */
  async extractText(file: File): Promise<string> {
    try {
      this.reportProgress({
        stage: 'loading',
        pagesCurrent: 0,
        pagesTotal: 0,
        message: 'Loading PDF file...'
      });

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      this.reportProgress({
        stage: 'parsing',
        pagesCurrent: 0,
        pagesTotal: 0,
        message: 'Parsing PDF structure...'
      });

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      this.reportProgress({
        stage: 'extracting',
        pagesCurrent: 0,
        pagesTotal: numPages,
        message: `Extracting text from ${numPages} pages...`
      });

      // Extract text from all pages
      const textPromises: Promise<string>[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        textPromises.push(this.extractPageText(pdf, pageNum, numPages));
      }

      const pageTexts = await Promise.all(textPromises);
      const fullText = pageTexts.join('\n\n');

      this.reportProgress({
        stage: 'complete',
        pagesCurrent: numPages,
        pagesTotal: numPages,
        message: 'Text extraction complete'
      });

      return fullText;
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from a single PDF page
   */
  private async extractPageText(pdf: any, pageNum: number, totalPages: number): Promise<string> {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      this.reportProgress({
        stage: 'extracting',
        pagesCurrent: pageNum,
        pagesTotal: totalPages,
        message: `Extracting page ${pageNum} of ${totalPages}...`
      });

      // Extract text items and join them
      const textItems = textContent.items.map((item: any) => item.str);
      return textItems.join(' ');
    } catch (error) {
      console.error(`Error extracting page ${pageNum}:`, error);
      return '';
    }
  }

  private reportProgress(progress: PdfProcessingProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }
}
