/**
 * Liturgical Day Renderer
 *
 * This service provides functions for rendering liturgical days in various formats.
 */

import { format } from 'date-fns';
import { LiturgicalDay } from '../calendar/enhanced/liturgicalDayService';
import { LiturgicalRank } from '../../models/calendar';

/**
 * Supported output formats
 */
export enum OutputFormat {
  TEXT = 'text',
  HTML = 'html',
  MARKDOWN = 'markdown',
  JSON = 'json'
}

/**
 * Interface for rendering options
 */
export interface RenderingOptions {
  format: OutputFormat;
  language?: 'latin' | 'english' | 'both';
  showRubrics?: boolean;
  showCommemorations?: boolean;
  includeDescription?: boolean;
  parishInfo?: ParishInfo;
}

/**
 * Interface for parish information
 */
export interface ParishInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  pastor?: string;
}

/**
 * Render a liturgical day in the specified format
 *
 * @param day The liturgical day to render
 * @param options Rendering options
 * @returns The rendered output
 */
export function renderLiturgicalDay(day: LiturgicalDay, options: RenderingOptions): string {
  switch (options.format) {
    case OutputFormat.TEXT:
      return renderAsText(day, options);
    case OutputFormat.HTML:
      return renderAsHtml(day, options);
    case OutputFormat.MARKDOWN:
      return renderAsMarkdown(day, options);
    case OutputFormat.JSON:
      return renderAsJson(day, options);
    default:
      throw new Error(`Unsupported output format: ${options.format}`);
  }
}

/**
 * Render a liturgical day as plain text
 *
 * @param day The liturgical day to render
 * @param options Rendering options
 * @returns The rendered text
 */
function renderAsText(day: LiturgicalDay, options: RenderingOptions): string {
  const lines: string[] = [];

  // Add parish information if provided
  if (options.parishInfo) {
    lines.push(options.parishInfo.name);
    if (options.parishInfo.address) lines.push(options.parishInfo.address);
    if (options.parishInfo.phone) lines.push(`Phone: ${options.parishInfo.phone}`);
    if (options.parishInfo.email) lines.push(`Email: ${options.parishInfo.email}`);
    if (options.parishInfo.website) lines.push(`Website: ${options.parishInfo.website}`);
    if (options.parishInfo.pastor) lines.push(`Pastor: ${options.parishInfo.pastor}`);
    lines.push('');
  }

  // Format the date
  const date = day.displayDate || new Date(day.date);
  lines.push(format(date, 'EEEE, MMMM d, yyyy'));
  lines.push('');

  // Add celebration information
  lines.push(day.celebration);
  lines.push(`Class: ${getRankName(day.rank)}`);
  lines.push(`Color: ${day.color}`);
  lines.push(`Season: ${day.season.name}`);

  // Add description if requested
  if (options.includeDescription && day.description) {
    lines.push('');
    lines.push(day.description);
  }

  // Add commemorations if requested
  if (options.showCommemorations && day.commemorations.length > 0) {
    lines.push('');
    lines.push('Commemorations:');
    for (const commemoration of day.commemorations) {
      lines.push(`- ${commemoration.name}`);
      if (options.includeDescription && commemoration.description) {
        lines.push(`  ${commemoration.description}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Render a liturgical day as HTML
 *
 * @param day The liturgical day to render
 * @param options Rendering options
 * @returns The rendered HTML
 */
function renderAsHtml(day: LiturgicalDay, options: RenderingOptions): string {
  let html = '<div class="liturgical-day">';

  // Add parish information if provided
  if (options.parishInfo) {
    html += '<div class="parish-info">';
    html += `<h1>${options.parishInfo.name}</h1>`;
    if (options.parishInfo.address) html += `<p>${options.parishInfo.address}</p>`;
    if (options.parishInfo.phone) html += `<p>Phone: ${options.parishInfo.phone}</p>`;
    if (options.parishInfo.email) html += `<p>Email: ${options.parishInfo.email}</p>`;
    if (options.parishInfo.website) html += `<p>Website: ${options.parishInfo.website}</p>`;
    if (options.parishInfo.pastor) html += `<p>Pastor: ${options.parishInfo.pastor}</p>`;
    html += '</div>';
  }

  // Format the date
  const date = day.displayDate || new Date(day.date);
  html += `<div class="date">${format(date, 'EEEE, MMMM d, yyyy')}</div>`;

  // Add celebration information
  html += `<h2 class="celebration" style="color: ${getColorHex(day.color)}">${day.celebration}</h2>`;
  html += '<div class="details">';
  html += `<p><strong>Class:</strong> ${getRankName(day.rank)}</p>`;
  html += `<p><strong>Color:</strong> <span style="color: ${getColorHex(day.color)}">${day.color}</span></p>`;
  html += `<p><strong>Season:</strong> ${day.season.name}</p>`;
  html += '</div>';

  // Add description if requested
  if (options.includeDescription && day.description) {
    html += `<div class="description">${day.description}</div>`;
  }

  // Add commemorations if requested
  if (options.showCommemorations && day.commemorations.length > 0) {
    html += '<div class="commemorations">';
    html += '<h3>Commemorations:</h3>';
    html += '<ul>';
    for (const commemoration of day.commemorations) {
      html += `<li>${commemoration.name}`;
      if (options.includeDescription && commemoration.description) {
        html += `<br><span class="description">${commemoration.description}</span>`;
      }
      html += '</li>';
    }
    html += '</ul>';
    html += '</div>';
  }

  html += '</div>';

  return html;
}

/**
 * Render a liturgical day as Markdown
 *
 * @param day The liturgical day to render
 * @param options Rendering options
 * @returns The rendered Markdown
 */
function renderAsMarkdown(day: LiturgicalDay, options: RenderingOptions): string {
  const lines: string[] = [];

  // Add parish information if provided
  if (options.parishInfo) {
    lines.push(`# ${options.parishInfo.name}`);
    if (options.parishInfo.address) lines.push(options.parishInfo.address);
    if (options.parishInfo.phone) lines.push(`**Phone:** ${options.parishInfo.phone}`);
    if (options.parishInfo.email) lines.push(`**Email:** ${options.parishInfo.email}`);
    if (options.parishInfo.website) lines.push(`**Website:** ${options.parishInfo.website}`);
    if (options.parishInfo.pastor) lines.push(`**Pastor:** ${options.parishInfo.pastor}`);
    lines.push('');
  }

  // Format the date
  const date = day.displayDate || new Date(day.date);
  lines.push(`## ${format(date, 'EEEE, MMMM d, yyyy')}`);
  lines.push('');

  // Add celebration information
  lines.push(`# ${day.celebration}`);
  lines.push(`**Class:** ${getRankName(day.rank)}`);
  lines.push(`**Color:** ${day.color}`);
  lines.push(`**Season:** ${day.season.name}`);

  // Add description if requested
  if (options.includeDescription && day.description) {
    lines.push('');
    lines.push(day.description);
  }

  // Add commemorations if requested
  if (options.showCommemorations && day.commemorations.length > 0) {
    lines.push('');
    lines.push('### Commemorations:');
    for (const commemoration of day.commemorations) {
      lines.push(`- **${commemoration.name}**`);
      if (options.includeDescription && commemoration.description) {
        lines.push(`  ${commemoration.description}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Render a liturgical day as JSON
 *
 * @param day The liturgical day to render
 * @param options Rendering options
 * @returns The rendered JSON
 */
function renderAsJson(day: LiturgicalDay, options: RenderingOptions): string {
  const output: any = {
    date: day.date,
    celebration: day.celebration,
    rank: {
      value: day.rank,
      name: getRankName(day.rank)
    },
    color: day.color,
    season: {
      id: day.season.id,
      name: day.season.name
    },
    isHolyDay: day.isHolyDay,
    isFeastDay: day.isFeastDay
  };

  // Add parish information if provided
  if (options.parishInfo) {
    output.parishInfo = options.parishInfo;
  }

  // Add description if requested
  if (options.includeDescription && day.description) {
    output.description = day.description;
  }

  // Add commemorations if requested
  if (options.showCommemorations && day.commemorations.length > 0) {
    output.commemorations = day.commemorations;
  }

  return JSON.stringify(output, null, 2);
}

/**
 * Get the name of a liturgical rank
 *
 * @param rank The liturgical rank
 * @returns The name of the rank
 */
function getRankName(rank: LiturgicalRank): string {
  switch (rank) {
    case LiturgicalRank.FIRST_CLASS:
      return 'First Class';
    case LiturgicalRank.SECOND_CLASS:
      return 'Second Class';
    case LiturgicalRank.THIRD_CLASS:
      return 'Third Class';
    case LiturgicalRank.FOURTH_CLASS:
      return 'Fourth Class';
    case LiturgicalRank.COMMEMORATION:
      return 'Commemoration';
    default:
      return 'Unknown';
  }
}

/**
 * Get the hex color code for a liturgical color
 *
 * @param color The liturgical color
 * @returns The hex color code
 */
function getColorHex(color: string): string {
  switch (color) {
    case 'white':
      return '#FFFFFF';
    case 'red':
      return '#FF0000';
    case 'green':
      return '#008000';
    case 'purple':
      return '#800080';
    case 'rose':
      return '#FF007F';
    case 'black':
      return '#000000';
    case 'gold':
      return '#FFD700';
    default:
      return '#000000';
  }
}
