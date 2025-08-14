import dictionaryService from '../src/services/dictionaryService';

async function main() {
  const words = process.argv.slice(2);
  for (const word of words) {
    try {
      const definitions = await dictionaryService.fetchDefinition(word);
      console.log(word, definitions[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? '');
    } catch (err) {
      console.error(`Error fetching ${word}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
