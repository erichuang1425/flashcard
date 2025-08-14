# SAT Vocabulary Import

This script downloads a SAT vocabulary list, enriches it with definitions from [Dictionary API](https://dictionaryapi.dev/), and writes a CSV compatible with the application's import tools.

## Usage

1. Ensure dependencies are installed: `npm install`.
2. Run the fetch script:

   ```bash
   npx tsx scripts/fetch_sat_vocab.ts
   ```

   The script downloads the raw word list, queries the dictionary API for missing English definitions and example sentences, and generates `public/sat.csv`.
3. Use the application's import interface and select `sat.csv` to add the words to your collection.

The generated CSV contains the headers `word, partOfSpeech, englishDefinition, chineseTranslation, categories`.
