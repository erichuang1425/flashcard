import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const sourceRoot = path.resolve(process.cwd(), 'src');
const uiRoots = ['pages', 'components', 'context'].map((directory) =>
  path.join(sourceRoot, directory)
);

const walk = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : walk(filePath);
    }
    return entry.name.endsWith('.tsx') ? [filePath] : [];
  });

const uiFiles = uiRoots.flatMap(walk);

describe('localized source audit', () => {
  it('does not render raw service error messages on localized screens', () => {
    const violations: string[] = [];

    for (const filePath of uiFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const visit = (node: ts.Node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          node.name.text === 'message' &&
          /(error|err)/i.test(node.expression.getText(sourceFile))
        ) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile)
          );
          violations.push(
            `${path.relative(sourceRoot, filePath)}:${line + 1}`
          );
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });

  it('keeps direct JSX labels limited to proper names and universal abbreviations', () => {
    const allowed = new Set([
      'FlashCards AI',
      'Georgia',
      'PDF',
      'Times New Roman',
      'Word',
      'XP',
    ]);
    const violations: string[] = [];

    for (const filePath of uiFiles) {
      const source = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const record = (node: ts.Node, value: string) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (
          /[A-Za-z\u3400-\u9fff]/.test(normalized) &&
          !allowed.has(normalized)
        ) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile)
          );
          violations.push(
            `${path.relative(sourceRoot, filePath)}:${line + 1}:${normalized}`
          );
        }
      };

      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
          record(node, node.text);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });
});
