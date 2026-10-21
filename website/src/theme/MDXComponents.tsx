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

function formatDate(value: unknown, timeZone?: string): string | null {
  if (!value) return null;
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00Z`)
      : new Date(value as string | number | Date);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

// Author, created date and last-updated date, shown under the page title.
function DocMeta() {
  const doc = useDocSafe();
  if (!doc) return null;
  const {frontMatter, metadata} = doc;
  const {author, created} = frontMatter as {author?: string; created?: unknown};

  const parts = [
    author && `By ${author}`,
    formatDate(created, 'UTC') && `Created ${formatDate(created, 'UTC')}`,
    formatDate(metadata.lastUpdatedAt) &&
      `Updated ${formatDate(metadata.lastUpdatedAt)}`,
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
