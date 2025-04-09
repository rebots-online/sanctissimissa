import { MassProper } from './texts';
import { LiturgicalDay } from './calendar';
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type PrintFormat = 'propers' | 'full-mass' | 'mass-with-rubrics' | 'mass-with-explanations';

export class PDFService {
  private static getFoldingGuides(): string {
    return `
      <div style="
        position: absolute;
        top: 5.5in;
        left: 0;
        width: 0.25in;
        height: 1px;
        border-top: 1px dashed #ccc;
      "></div>
      <div style="
        position: absolute;
        top: 0;
        left: 4.25in;
        width: 1px;
        height: 0.25in;
        border-left: 1px dashed #ccc;
      "></div>
    `;
  }

  private static getPropersPDFContent(proper: MassProper, day: LiturgicalDay): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Mass Propers - ${day.celebration}</title>
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0.5in;
            }
            body {
              font-family: "Times New Roman", Times, serif;
              font-size: 12pt;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 1em;
            }
            .celebration {
              font-size: 16pt;
              font-weight: bold;
            }
            .season {
              font-style: italic;
              color: #666;
            }
            .section {
              margin: 1em 0;
            }
            .section-title {
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 0.5em;
            }
            .latin {
              font-style: italic;
            }
            .english {
              margin-top: 0.25em;
              color: #444;
            }
            .page-break {
              page-break-before: always;
            }
            .fold-guides {
              display: none;
              @media print {
                display: block;
              }
            }
          </style>
        </head>
        <body>
          ${this.getFoldingGuides()}
          
          <div class="header">
            <div class="celebration">${day.celebration}</div>
            <div class="season">${day.season.replace('_', ' ').toUpperCase()}</div>
          </div>

          <div class="section">
            <div class="section-title">Introit</div>
            <div class="latin">${proper.introit.latin}</div>
            <div class="english">${proper.introit.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Collect</div>
            <div class="latin">${proper.collect.latin}</div>
            <div class="english">${proper.collect.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Epistle</div>
            <div class="latin">${proper.epistle.latin}</div>
            <div class="english">${proper.epistle.english}</div>
          </div>

          <div class="section page-break">
            <div class="section-title">Gradual</div>
            <div class="latin">${proper.gradual.latin}</div>
            <div class="english">${proper.gradual.english}</div>
          </div>

          ${proper.alleluia ? `
            <div class="section">
              <div class="section-title">Alleluia</div>
              <div class="latin">${proper.alleluia.latin}</div>
              <div class="english">${proper.alleluia.english}</div>
            </div>
          ` : ''}

          ${proper.tract ? `
            <div class="section">
              <div class="section-title">Tract</div>
              <div class="latin">${proper.tract.latin}</div>
              <div class="english">${proper.tract.english}</div>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Gospel</div>
            <div class="latin">${proper.gospel.latin}</div>
            <div class="english">${proper.gospel.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Offertory</div>
            <div class="latin">${proper.offertory.latin}</div>
            <div class="english">${proper.offertory.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Secret</div>
            <div class="latin">${proper.secret.latin}</div>
            <div class="english">${proper.secret.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Communion</div>
            <div class="latin">${proper.communion.latin}</div>
            <div class="english">${proper.communion.english}</div>
          </div>

          <div class="section">
            <div class="section-title">Post Communion</div>
            <div class="latin">${proper.postcommunion.latin}</div>
            <div class="english">${proper.postcommunion.english}</div>
          </div>
        </body>
      </html>
    `;
  }

  static async generateAndShare(
    proper: MassProper,
    day: LiturgicalDay,
    format: PrintFormat = 'propers'
  ): Promise<void> {
    try {
      let html = '';
      switch (format) {
        case 'propers':
          html = this.getPropersPDFContent(proper, day);
          break;
        // TODO: Implement other formats
        default:
          html = this.getPropersPDFContent(proper, day);
      }

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === 'ios') {
        await Print.printAsync({
          html,
          printerUrl: undefined,
        });
      } else {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Failed to generate or share PDF:', error);
      throw error;
    }
  }
}