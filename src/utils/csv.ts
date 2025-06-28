export const parseCSVLine = (line: string): string[] => {
  const result = [] as string[];
  let cell = '';
  let isQuoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (isQuoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (char === ',' && !isQuoted) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }

  // Always push the final cell even if empty to handle trailing commas
  result.push(cell.trim());

  return result;
};
