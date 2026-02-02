/**
 * PRD generator: produces research-grounded planning documents with
 * references to NotebookLM findings stored in .msw/research/.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PrdConfig {
  projectName: string;
  description: string;
  researchDir: string;
  constraints: string[];
  requirements: string[];
}

export interface ResearchReference {
  query: string;
  answer: string;
  source: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Research loading                                                    */
/* ------------------------------------------------------------------ */

/**
 * Read all .md files in `researchDir`, extract Q&A pairs from the
 * report-compiler format (YAML frontmatter + `## Q<n>: <question>` sections).
 */
export function loadResearchReports(researchDir: string): ResearchReference[] {
  if (!fs.existsSync(researchDir)) {
    return [];
  }

  const refs: ResearchReference[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        refs.push(...extractReferences(full));
      }
    }
  };

  walk(researchDir);
  return refs;
}

function extractReferences(filePath: string): ResearchReference[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const notebook = (data.notebook as string) ?? path.basename(filePath, '.md');
  const endTime = (data.endTime as string) ?? '';

  // Split on Q&A headings produced by report-compiler: ## Q1: <question>
  const qaSections = content.split(/^## Q\d+:\s*/m).filter(Boolean);

  const refs: ResearchReference[] = [];

  for (const section of qaSections) {
    const lines = section.split('\n');
    const query = lines[0]?.trim() ?? '';
    if (!query) continue;

    // The answer is everything after the metadata blockquote line(s)
    const bodyLines: string[] = [];
    let pastMeta = false;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!pastMeta && line.startsWith('>')) {
        pastMeta = true;
        continue;
      }
      if (!pastMeta && line.trim() === '') continue;
      pastMeta = true;
      bodyLines.push(line);
    }

    const answer = bodyLines.join('\n').trim();
    if (!answer) continue;

    refs.push({
      query,
      answer: answer.length > 300 ? answer.slice(0, 297) + '...' : answer,
      source: notebook,
      timestamp: endTime,
    });
  }

  return refs;
}

/* ------------------------------------------------------------------ */
/*  PRD generation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generate a markdown PRD enriched with research citations.
 */
export function generatePrd(config: PrdConfig): string {
  const refs = loadResearchReports(config.researchDir);
  const lines: string[] = [];

  // Title
  lines.push(`# ${config.projectName} - Product Requirements`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push('');
  lines.push(config.description);
  lines.push('');

  // Requirements
  lines.push('## Requirements');
  lines.push('');
  config.requirements.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
  lines.push('');

  // Constraints
  lines.push('## Constraints');
  lines.push('');
  config.constraints.forEach((c) => {
    lines.push(`- ${c}`);
  });
  lines.push('');

  // Research References
  lines.push('## Research References');
  lines.push('');

  if (refs.length === 0) {
    lines.push(
      'No NotebookLM research available. Consider running msw_research first.',
    );
  } else {
    for (const ref of refs) {
      lines.push(`> **Q:** ${ref.query}`);
      lines.push(`>`);
      lines.push(`> ${ref.answer}`);
      lines.push(`>`);
      lines.push(`> *Source: ${ref.source}${ref.timestamp ? ` (${ref.timestamp})` : ''}*`);
      lines.push('');
    }
  }
  lines.push('');

  // Generated timestamp
  lines.push('## Generated');
  lines.push('');
  lines.push(new Date().toISOString());
  lines.push('');

  return lines.join('\n');
}
