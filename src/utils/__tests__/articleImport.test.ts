import JSZip from 'jszip';
import { ArticleImportError, parseArticleArchive } from '../articleImport';

describe('parseArticleArchive', () => {
  it('reads article details, content, and an optional cover image', async () => {
    const zip = new JSZip();
    zip.file(
      'details.json',
      JSON.stringify({
        title: 'Imported article',
        subtitle: 'A subtitle',
        category: 'news',
        cover_image: 'cover.png',
        article_url: 'https://example.com/article',
      })
    );
    zip.file('content.txt', 'First paragraph.\n\nSecond paragraph.');
    zip.file('cover.png', new Uint8Array([1, 2, 3]));
    const archive = await zip.generateAsync({ type: 'uint8array' });

    const result = await parseArticleArchive(archive);

    expect(result).toMatchObject({
      title: 'Imported article',
      subtitle: 'A subtitle',
      category: 'news',
      content: 'First paragraph.\n\nSecond paragraph.',
      sourceUrl: 'https://example.com/article',
    });
    expect(result.coverImage?.name).toBe('cover.png');
  });

  it('rejects archives missing required article files', async () => {
    const archive = await new JSZip().generateAsync({ type: 'uint8array' });

    await expect(parseArticleArchive(archive)).rejects.toMatchObject({
      code: 'missingDetails',
    } satisfies Partial<ArticleImportError>);
  });
});
