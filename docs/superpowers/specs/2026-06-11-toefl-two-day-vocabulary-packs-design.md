# TOEFL Two-Day Vocabulary Packs

## Goal

Add seven one-click vocabulary packs for the TOEFL iBT format used from
January 21, 2026. The packs target an A2 to low-B1 learner who has two days to
prepare for University of the Arts London (UAL), needs TOEFL band 4 overall and
in every skill, and is weakest in Reading and Writing.

## Evidence Base

The pack structure follows the current ETS TOEFL iBT blueprint:

- Reading: Complete the Words, Read in Daily Life, and Read an Academic
  Passage.
- Writing: Build a Sentence, Write an Email, and Write for an Academic
  Discussion.
- Listening: Listen and Choose a Response, Listen to a Conversation, Listen to
  an Announcement, and Listen to an Academic Talk.
- Speaking: Listen and Repeat and Take an Interview.

The selection strategy also uses corpus-based academic vocabulary principles:
prefer frequent, widely distributed academic lemmas and reusable language
functions over rare or discipline-specific words.

## Scope

Create 160 cards across seven packs:

| Pack | Cards | Primary purpose |
| --- | ---: | --- |
| Reading: Academic Core | 32 | High-frequency cross-disciplinary academic words |
| Reading: Word Families and Context Clues | 24 | Morphology, inference, and word-form recognition |
| Connectors and Logical Relationships | 24 | Cause, contrast, addition, example, sequence, and conclusion |
| Writing: Build a Sentence | 24 | High-yield grammatical patterns and sentence frames |
| Writing: Email Functions | 18 | Polite requests, explanations, apologies, follow-up, and closing |
| Writing: Academic Discussion | 22 | Clear claims, reasons, examples, comparison, qualification, and conclusion |
| Listening and Speaking Safety Net | 16 | Campus language and short interview-response chunks |

Reading and Writing receive 144 cards when the shared connector pack is counted
for both skills. The final pack protects against UAL's minimum score in every
section.

## Card Format

Each CSV uses the existing columns:

```text
word,partOfSpeech,englishDefinition,chineseTranslation
```

Field rules:

- `word`: a single lemma, fixed phrase, or compact sentence pattern.
- `partOfSpeech`: a normal part of speech for vocabulary, or a concise function
  label such as `connector`, `sentence pattern`, or `email phrase`.
- `englishDefinition`: plain English suitable for an A2 to low-B1 learner. For
  productive phrases, include one short example after a semicolon.
- `chineseTranslation`: natural Traditional Chinese, including a brief usage
  cue when a literal translation would not explain the function.
- CSV fields containing commas or quotation marks must be correctly quoted.
- Every row must have exactly four non-empty fields.

## Selection Rules

Include an item only when it satisfies at least one high-value use case:

- frequent across academic subjects;
- directly useful for recognizing a logical relationship;
- helps infer meaning through a common prefix, suffix, or word family;
- can be reused safely in the current Writing tasks;
- common in campus communication or interview responses;
- simple enough to learn and apply within 48 hours.

Exclude:

- rare literary vocabulary;
- narrow technical terminology;
- ornamental synonyms whose main value is sounding advanced;
- long memorized templates;
- idioms likely to be misused by an A2 to low-B1 learner;
- duplicate headwords or near-identical functions across packs unless the
  second card teaches a genuinely different use.

## Pack Boundaries

### Reading: Academic Core

Use concrete, cross-disciplinary lemmas such as words for evidence, change,
comparison, cause, method, result, and importance. Definitions must identify
the meaning most likely in an academic passage.

### Reading: Word Families and Context Clues

Teach visible affixes and related forms as compact cards, for example a pattern
such as `-tion / -sion` rather than separate low-value cards for many nouns.
Cover noun, adjective, adverb, negative-prefix, quantity, and relationship
signals that support Complete the Words and passage inference.

### Connectors and Logical Relationships

Organize around semantic relationships rather than prestige. Include addition,
contrast, concession, cause, result, example, sequence, comparison, condition,
and summary. Definitions must distinguish easily confused connectors.

### Writing: Build a Sentence

Use compact patterns that reinforce word order, agreement, tense, articles,
prepositions, infinitives, gerunds, relative clauses, conditionals, comparison,
and cause-effect syntax. Each pattern must include a short model sentence.

### Writing: Email Functions

Cover greeting, purpose, polite request, clarification, scheduling, reason,
apology, solution, appreciation, follow-up, and closing. Phrases must work in
semi-formal academic or campus email without sounding excessively formal.

### Writing: Academic Discussion

Cover taking a position, agreeing or disagreeing politely, giving a reason,
adding an example, comparing ideas, explaining consequences, qualifying a
claim, and concluding. Favor short controllable chunks over full templates.

### Listening and Speaking Safety Net

Include common campus actions and short response frames for opinions,
preferences, reasons, examples, predictions, and clarification. Items must be
natural when spoken and short enough to repeat accurately.

## Application Integration

- Add all seven CSV files under `public/`.
- Register each file in `BUNDLED_PACKS` in `ImportTools.tsx`.
- Assign the stable category `TOEFL iBT` to every pack.
- Add English and Traditional Chinese labels and descriptions.
- Update the ready-made-pack introduction so it describes both PTE and TOEFL
  packs.
- Update the README to mention current-format TOEFL iBT packs.

## Validation

Automated validation must prove:

- all seven files exist;
- each file has the standard header and exact expected row count;
- every row parses into exactly four non-empty fields;
- every Chinese field contains Traditional Chinese text and no replacement
  characters or obvious mojibake;
- headwords are unique across the seven TOEFL files;
- all seven packs are registered with the `TOEFL iBT` category;
- English and Traditional Chinese translation keys remain in parity.

Run focused tests, the full test suite, type checking, and a production build.

## Two-Day Use Order

The UI lists packs in this order:

1. Reading: Academic Core
2. Connectors and Logical Relationships
3. Writing: Build a Sentence
4. Writing: Email Functions
5. Writing: Academic Discussion
6. Reading: Word Families and Context Clues
7. Listening and Speaking Safety Net

This ordering puts the highest immediate return first while keeping every
section represented.
