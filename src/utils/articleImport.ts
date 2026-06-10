import JSZip from 'jszip';
import { ArticleImport } from '../types/reading';

interface ArticlePackageDetails {
  title?: unknown;
  subtitle?: unknown;
  category?: unknown;
  cover_image?: unknown;
  article_url?: unknown;
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const imageMimeType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/png';
};

export const parseArticleArchive = async (
  archive: ArrayBuffer | Uint8Array
): Promise<ArticleImport> => {
  const zip = await JSZip.loadAsync(archive);
  const detailsFile = zip.file('details.json');
  if (!detailsFile) {
    throw new Error('Article archive is missing details.json');
  }

  const contentFile = zip.file('content.txt');
  if (!contentFile) {
    throw new Error('Article archive is missing content.txt');
  }

  let details: ArticlePackageDetails;
  try {
    details = JSON.parse(await detailsFile.async('string')) as ArticlePackageDetails;
  } catch {
    throw new Error('Article archive contains invalid details.json');
  }

  const title = optionalString(details.title);
  if (!title) {
    throw new Error('Article archive details.json is missing a title');
  }

  const content = await contentFile.async('string');
  if (!content.trim()) {
    throw new Error('Article archive content.txt is empty');
  }

  const coverName = optionalString(details.cover_image);
  const coverEntry = coverName ? zip.file(coverName) : null;
  const coverBytes = coverEntry
    ? await coverEntry.async('uint8array')
    : undefined;

  return {
    title,
    subtitle: optionalString(details.subtitle),
    category: optionalString(details.category),
    content,
    coverImage:
      coverName && coverBytes
        ? new File([coverBytes], coverName, {
            type: imageMimeType(coverName),
          })
        : undefined,
    sourceUrl: optionalString(details.article_url),
  };
};
