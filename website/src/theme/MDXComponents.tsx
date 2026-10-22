import React, {type ComponentProps} from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import {useDoc} from '@docusaurus/plugin-content-docs/client';

// Docs only: blog posts and pages have no doc context.
function useDocSafe() {
  try {
    return useDoc();
  } catch {
    return null;
  }
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00Z`)
      : new Date(value as string | number | Date);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(value: unknown, timeZone?: string): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

// Used when a doc has no `created` front matter.
const DEFAULT_CREATED = '2026-10-21';

// Calendar day as a sortable YYYY-MM-DD string.
function dayKey(value: unknown, timeZone?: string): string | null {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-CA', {timeZone}) : null;
}

// Author, created date and last-updated date, shown under the page title.
function DocMeta() {
  const doc = useDocSafe();
  if (!doc) return null;
  const {frontMatter, metadata} = doc;
  const {author, created = DEFAULT_CREATED} = frontMatter as {
    author?: string;
    created?: unknown;
  };

  // Only show "Updated" for a change made after the created day.
  const createdDay = dayKey(created, 'UTC');
  const updatedDay = dayKey(metadata.lastUpdatedAt);
  const showUpdated =
    updatedDay !== null && (createdDay === null || updatedDay > createdDay);

  const parts = [
    author && `By ${author}`,
    formatDate(created, 'UTC') && `Created ${formatDate(created, 'UTC')}`,
    showUpdated && `Updated ${formatDate(metadata.lastUpdatedAt)}`,
  ].filter(Boolean);

  if (parts.length === 0) return null;
  return <p className="doc-meta">{parts.join(' · ')}</p>;
}

function H1(props: ComponentProps<'h1'>) {
  return (
    <>
      <MDXComponents.h1 {...props} />
      <DocMeta />
    </>
  );
}

export default {
  ...MDXComponents,
  h1: H1,
};
