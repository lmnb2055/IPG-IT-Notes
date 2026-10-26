import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {execFile} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {promisify} from 'node:util';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const run = promisify(execFile);

async function git(args: string[]): Promise<string> {
  try {
    const {stdout} = await run('git', args);
    return stdout.trim();
  } catch {
    return '';
  }
}

// "Updated" date for docs: a file with uncommitted edits uses its modified
// time, otherwise the date of its last git commit. Also used by `npm start`,
// where Docusaurus would otherwise show a hardcoded 2018 date.
async function getFileLastUpdateInfo(filePath: string) {
  if (await git(['status', '--porcelain', '--', filePath])) {
    const {mtimeMs} = await stat(filePath);
    return {timestamp: Math.round(mtimeMs), author: ''};
  }
  const seconds = await git(['log', '-1', '--format=%ct', '--', filePath]);
  return seconds ? {timestamp: Number(seconds) * 1000, author: ''} : null;
}

const config: Config = {
  title: 'IT Documentation',
  tagline: 'Clear documentations are cool',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    experimental_vcs: {
      initialize: () => {},
      // Creation date comes from the `created` front matter instead.
      getFileCreationInfo: async (_filePath: string) => null,
      getFileLastUpdateInfo,
    },
  },

  // Set the production url of your site here
  url: 'https://lmnb2055.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/IPG-IT-Notes/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'lmnb2055', // Usually your GitHub org/user name.
  projectName: 'IPG-IT-Notes', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // A category with `customProps.sectionTitle` in its _category_.json
          // gets a section label above it in the sidebar.
          async sidebarItemsGenerator({defaultSidebarItemsGenerator, ...args}) {
            const items = await defaultSidebarItemsGenerator(args);
            return items.flatMap((item) => {
              const title =
                'customProps' in item ? item.customProps?.sectionTitle : null;
              if (typeof title !== 'string') return [item];
              return [
                {
                  type: 'html',
                  value: title,
                  className: 'sidebar-section-title',
                  defaultStyle: true,
                },
                item,
              ];
            });
          },
          showLastUpdateTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/lmnb2055/IPG-IT-Notes/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/lmnb2055/IPG-IT-Notes/tree/main/website/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'IPG-IT Team',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Knowledge Base',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://www.sidneychen.cc/contact',
          label: 'Contact',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Inteplast Group Website',
              href: 'https://www.inteplast.com/',
            },
            {
              label: 'Inteplast Group Intranet',
              href: 'https://ipg.inteplast.com/',
            },
            {
              label: 'IT Helpdesk Portal',
              href: 'https://helpdesk.inteplast.com/home',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              // Click copies the address; falls back to opening the mail app
              // if the browser blocks clipboard access.
              html: `<a href="mailto:itsupport@inteplast.com" class="footer__link-item" title="Click to copy itsupport@inteplast.com"
                onclick="var a=this;if(!navigator.clipboard){return true;}event.preventDefault();
                navigator.clipboard.writeText('itsupport@inteplast.com').then(function(){
                  a.textContent='Copied: itsupport@inteplast.com';
                  setTimeout(function(){a.textContent='IT Support Email';},2000);
                },function(){location.href=a.href;});">IT Support Email</a>`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
