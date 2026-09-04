/**
 * Editor presets for the two rich-text surfaces (ARCHITECTURE §7.6 editor row).
 *
 * v48 licensing: everything here must be FREE (GPL) — Base64UploadAdapter,
 * PasteFromOffice, RemoveFormat, TableProperties/TableCellProperties and
 * ListProperties are premium-gated and throw license-key-plugin-not-allowed.
 * Image upload goes through our DataUriUploadAdapterPlugin instead; link
 * allow-listing through LinkPolicy (both in this directory).
 */

import {
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlight,
  BlockQuote,
  HorizontalLine,
  Alignment,
  List,
  Indent,
  IndentBlock,
  Autoformat,
  Link,
  AutoLink,
  Image,
  ImageBlock,
  ImageInline,
  ImageStyle,
  ImageCaption,
  ImageToolbar,
  ImageUpload,
  Table,
  TableToolbar,
  TableCaption,
  SourceEditing,
  type EditorConfig,
} from 'ckeditor5';
import { LinkPolicy } from './linkPolicy.ts';
import { DataUriUploadAdapterPlugin } from './base64UploadAdapter.ts';

export type RichTextPreset = 'main' | 'compact';

const FREE_PLUGINS = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlight,
  BlockQuote,
  HorizontalLine,
  Alignment,
  List,
  Indent,
  IndentBlock,
  Autoformat,
  Link,
  AutoLink,
  Image,
  ImageBlock,
  ImageInline,
  ImageStyle,
  ImageCaption,
  ImageToolbar,
  ImageUpload,
  DataUriUploadAdapterPlugin,
  Table,
  TableToolbar,
  TableCaption,
  LinkPolicy,
  SourceEditing,
] as const;

const COMPACT_PLUGINS = [
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Link,
  AutoLink,
  BlockQuote,
  LinkPolicy,
] as const;

export function buildConfig(preset: RichTextPreset, placeholder?: string): EditorConfig {
  if (preset === 'compact') {
    return {
      licenseKey: 'GPL',
      placeholder: placeholder ?? 'Add a note…',
      plugins: [...COMPACT_PLUGINS],
      toolbar: ['bold', 'italic', 'underline', '|', 'link', 'blockQuote'],
      link: { addTargetToExternalLinks: true },
    };
  }

  return {
    licenseKey: 'GPL',
    placeholder: placeholder ?? 'Write…',
    plugins: [...FREE_PLUGINS],
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', 'code', '|',
        'highlight', 'link', 'blockQuote', '|',
        'bulletedList', 'numberedList', 'outdent', 'indent', '|',
        'alignment', 'horizontalLine', 'insertTable', '|',
        'uploadImage', 'sourceEditing', '|',
        'undo', 'redo',
      ],
      // default overflow grouping keeps the sidecar/narrow layouts usable
      shouldNotGroupWhenFull: false,
    },
    menuBar: { isVisible: true },
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      ],
    },
    alignment: {
      options: [{ name: 'left' }, { name: 'center' }, { name: 'right' }, { name: 'justify' }],
    },
    image: {
      toolbar: ['imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|', 'toggleImageCaption'],
    },
    table: {
      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
    },
    link: {
      addTargetToExternalLinks: true,
    },
  };
}
