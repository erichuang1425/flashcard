import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  TablePagination,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Grid,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Snackbar,
} from "@mui/material";
import PreviewIcon from "@mui/icons-material/Preview";
import ErrorIcon from "@mui/icons-material/Error";
import { uploadFile } from "../services/storage";
import {
  addCategory,
  addFlashcard,
  getFlashcardMetadata,
  getUserFlashcards,
} from "../services/firestore";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { ImportManualEntry } from "./ImportManualEntry";
import type { FlashcardsResponse } from "../types/responses";
import type { Flashcard } from "../types";
import { translateToTraditionalChinese } from "../services/translationService";

interface ImportStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  completed: boolean;
}

interface PreviewData {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation: string;
  categories: string[];
}

const parseCSVLine = (line: string): string[] => {
  const result = [];
  let cell = "";
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
    } else if (char === "," && !isQuoted) {
      result.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell) {
    result.push(cell.trim());
  }

  return result;
};

interface ImportToolsProps {
  defaultMode: "file" | "manual";
  onModeChange: (mode: "file" | "manual") => void;
}

interface SavedEntry {
  word: string;
  partOfSpeech: string;
  englishDefinition: string;
  chineseTranslation: string;
  categories: Record<string, number>;
  exampleSentence?: string | null;
}

export const ImportTools: React.FC<ImportToolsProps> = ({
  defaultMode,
  onModeChange,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    completed: false,
  });
  const [preview, setPreview] = useState<PreviewData[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [fullPreview, setFullPreview] = useState<PreviewData[]>([]);
  const [importMode, setImportMode] = useState<"file" | "manual">(defaultMode);
  const [existingWords, setExistingWords] = useState<Set<string>>(new Set());
  const [manualEntry, setManualEntry] = useState({
    word: "",
    partOfSpeech: "",
    englishDefinition: "",
    chineseTranslation: "",
    categories: [] as string[],
  });
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    severity: "success" | "error" | "info";
    open: boolean;
  }>({
    message: "",
    severity: "info",
    open: false,
  });
  const [manualImportProgress, setManualImportProgress] = useState({
    total: 0,
    current: 0,
    inProgress: false,
  });

  const showNotification = (
    message: string,
    severity: "success" | "error" | "info" = "success"
  ) => {
    setNotification({
      message,
      severity,
      open: true,
    });
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCategories(event.target.value as string[]);
  };

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const response: FlashcardsResponse = await getUserFlashcards(user.uid);
        const uniqueCategories = new Set<string>();
        response.cards.forEach((card: Flashcard) => {
          card.categories && Object.keys(card.categories).forEach(category =>
            uniqueCategories.add(category)
          );
        });
        setGlobalCategories(Array.from(uniqueCategories));
      } catch (err) {
        setError("Failed to load categories");
      }
    };
    const loadExistingWords = async () => {
      if (!user) return;
      try {
        const metadata = await getFlashcardMetadata(user.uid);
        if (metadata && metadata.items) {
          const wordSet = new Set(
            metadata.items.map((item) => item.word.toLowerCase().trim())
          );
          setExistingWords(wordSet);
        }
      } catch (err) {
        console.error("Error loading existing words:", err);
      }
    };
    loadExistingWords();
    loadCategories();
  }, [user]);

  const processCSV = async (csvText: string) => {
    try {
      const dataLines = csvText
        .split("\n")
        .filter((line) => line.trim())
        .slice(1);

      setActiveStep(2);
      setStats({
        total: dataLines.length,
        processed: 0,
        success: 0,
        failed: 0,
        completed: false,
      });

      const batchSize = 5;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);

        for (let j = 0; j < batch.length; j++) {
          const [
            word,
            partOfSpeech,
            englishDefinition,
            chineseTranslation,
            categoriesStr,
          ] = parseCSVLine(batch[j]);

          try {
            if (
              word &&
              partOfSpeech &&
              englishDefinition &&
              chineseTranslation &&
              user
            ) {
              const lineCategories = (categoriesStr
                ? categoriesStr.split(";").map(c => c.trim()).filter(Boolean)
                : selectedCategories)
                .reduce((acc, cat, idx) => {
                  acc[cat] = idx;
                  return acc;
                }, {} as Record<string, number>);

              await addFlashcard({
                userId: user.uid,
                word: word.trim(),
                partOfSpeech,
                englishDefinition,
                chineseTranslation,
                categories: lineCategories,
                difficulty: 0,
                created: new Date(),
                lastReviewed: undefined,
                nextReview: new Date(),
                state: "NEW",
                interval: 0,
                easeFactor: 2.5,
                reviews: 0,
                successRate: 0,
                totalCorrect: 0,
                mature: false,
              });

              setStats((prev) => ({
                ...prev,
                processed: i + j + 1,
                success: prev.success + 1,
                completed: i + j + 1 === dataLines.length,
              }));
            }
          } catch (err) {
            setStats((prev) => ({
              ...prev,
              processed: i + j + 1,
              failed: prev.failed + 1,
              completed: i + j + 1 === dataLines.length,
            }));
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import flashcards"
      );
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const allPreviewData = lines.slice(1).map((line) => {
          const [
            word,
            partOfSpeech,
            englishDefinition,
            chineseTranslation,
            categoriesStr,
          ] = parseCSVLine(line);
          const categories = categoriesStr
            ? categoriesStr
                .split(";")
                .map((c) => c.trim())
                .filter(Boolean)
            : [];
          return {
            word,
            partOfSpeech,
            englishDefinition,
            chineseTranslation,
            categories,
          };
        });
        setFullPreview(allPreviewData);
        setPreview(allPreviewData.slice(0, rowsPerPage));
        setActiveStep(1);
        setText(text);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const [text, setText] = useState<string | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setPreview(
      fullPreview.slice(newPage * rowsPerPage, (newPage + 1) * rowsPerPage)
    );
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setPreview(fullPreview.slice(0, newRowsPerPage));
  };

  const renderPreview = () => (
    <Paper sx={{ mt: 2, width: "100%", overflow: "hidden" }}>
      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("import.manual.word")}</TableCell>
              <TableCell>{t("import.manual.partOfSpeech")}</TableCell>
              <TableCell>{t("import.manual.englishDefinition")}</TableCell>
              <TableCell>{t("import.manual.chineseTranslation")}</TableCell>
              <TableCell>{t("import.manual.categories")}</TableCell>
              <TableCell align="center">{t("import.manual.status")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {preview.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                <TableCell>{row.word}</TableCell>
                <TableCell>{row.partOfSpeech}</TableCell>
                <TableCell>
                  <Tooltip title={row.englishDefinition} arrow>
                    <span>
                      {row.englishDefinition.length > 50
                        ? `${row.englishDefinition.slice(0, 50)}...`
                        : row.englishDefinition}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{row.chineseTranslation}</TableCell>
                <TableCell>
                  {row.categories.length > 0 ? row.categories.join(", ") : "-"}
                </TableCell>
                <TableCell align="center">
                  {!row.word ||
                  !row.partOfSpeech ||
                  !row.englishDefinition ||
                  !row.chineseTranslation ? (
                    <Tooltip title="Missing required fields" arrow>
                      <ErrorIcon color="error" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Valid entry" arrow>
                      <PreviewIcon color="success" />
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={fullPreview.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Paper>
  );

  const renderProgress = () => (
    <Box sx={{ mt: 2 }}>
      <LinearProgress
        variant="determinate"
        value={stats.total ? (stats.processed / stats.total) * 100 : 0}
        sx={{ height: 8, borderRadius: 2 }}
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        {t("import.progress.processed")}:{" "}
        {stats.total ? Math.round((stats.processed / stats.total) * 100) : 0}% ({stats.processed}/
        {stats.total})
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t("import.progress.success")}: {stats.success},{" "}
        {t("import.progress.failed")}: {stats.failed}
      </Typography>
      {stats.completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {stats.failed > 0
            ? t("import.progress.completeWithErrors")
            : t("import.progress.complete")}
        </Alert>
      )}
    </Box>
  );

  const handleManualSubmit = async (data: {
    word: string;
    partOfSpeech: string;
    englishDefinition: string;
    chineseTranslation: string;
    categories: string[];
    exampleSentence: string;
  }) => {
    if (!user) return;

    const normalizedWord = data.word.toLowerCase().trim();
    
    const categoriesRecord = data.categories.reduce((acc, cat, idx) => {
      acc[cat] = idx;
      return acc;
    }, {} as Record<string, number>);

    const entry: SavedEntry = {
      ...data,
      categories: categoriesRecord
    };
    if (
      existingWords.has(normalizedWord) ||
      savedEntries.some((e) => e.word.toLowerCase().trim() === normalizedWord)
    ) {
      showNotification(
        t("import.errors.duplicateWord", { values: { word: entry.word } }),
        "error"
      );
      return;
    }

    try {
      setUploading(true);
      setExistingWords((prev) => new Set(prev).add(normalizedWord));
      showNotification(t("import.notifications.progress"), "info");

      setSavedEntries((prev) => [
        ...prev,
        {
          ...entry,
          exampleSentence: entry.exampleSentence || null,
        },
      ]);
      showNotification(t("import.notifications.added"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
      showNotification(t("import.errors.savingEntry"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleImportSaved = async () => {
    if (!user || savedEntries.length === 0) return;

    try {
      setUploading(true);
      setManualImportProgress({
        total: savedEntries.length,
        current: 0,
        inProgress: true,
      });
      showNotification(t("import.notifications.progress"), "info");

      for (let i = 0; i < savedEntries.length; i++) {
        const entry = savedEntries[i];
        await addFlashcard({
          userId: user.uid,
          ...entry,
          exampleSentence: entry.exampleSentence || undefined,
          difficulty: 0,
          created: new Date(),
          lastReviewed: undefined,
          nextReview: new Date(),
          state: "NEW",
          interval: 0,
          easeFactor: 2.5,
          reviews: 0,
          successRate: 0,
          totalCorrect: 0,
          mature: false,
        });

        setManualImportProgress((prev) => ({
          ...prev,
          current: i + 1,
        }));
      }

      setSavedEntries([]);
      setManualImportProgress((prev) => ({ ...prev, inProgress: false }));
      showNotification(t("import.notifications.imported"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import flashcards"
      );
      showNotification(t("import.errors.importFailed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSaved = (index: number) => {
    setSavedEntries((prev) => prev.filter((_, i) => i !== index));
    showNotification(t("import.notifications.deleted"));
  };

  const renderManualEntry = () => (
    <Box>
      <ImportManualEntry
        onSubmit={handleManualSubmit}
        availableCategories={globalCategories}
      />

      {savedEntries.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t("import.manual.savedEntries")} ({savedEntries.length})
          </Typography>
          <Paper sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("import.manual.word")}</TableCell>
                  <TableCell>{t("import.manual.partOfSpeech")}</TableCell>
                  <TableCell>{t("import.manual.englishDefinition")}</TableCell>
                  <TableCell>{t("import.manual.chineseTranslation")}</TableCell>
                  <TableCell>{t("fields.exampleSentence")}</TableCell>
                  <TableCell align="center">
                    {t("import.manual.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {savedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {entry.word}
                      {existingWords.has(entry.word.toLowerCase().trim()) && (
                        <Typography
                          color="error"
                          variant="caption"
                          display="block"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {t("import.errors.duplicate")}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{entry.partOfSpeech}</TableCell>
                    <TableCell>
                      <Tooltip title={entry.englishDefinition}>
                        <span>
                          {entry.englishDefinition.slice(0, 30)}
                          {entry.englishDefinition.length > 30 ? "..." : ""}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{entry.chineseTranslation}</TableCell>
                    <TableCell>
                      <Tooltip title={entry.exampleSentence || ""}>
                        <span>
                          {entry.exampleSentence
                            ? entry.exampleSentence.slice(0, 30) +
                              (entry.exampleSentence.length > 30 ? "..." : "")
                            : "-"}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSaved(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Button
            variant="contained"
            onClick={handleImportSaved}
            disabled={uploading}
            sx={{ mt: 2 }}
            fullWidth
          >
            {t("import.actions.importSaved")} ({savedEntries.length})
          </Button>
        </Box>
      )}

      {manualImportProgress.inProgress && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={
              (manualImportProgress.current / manualImportProgress.total) * 100
            }
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t("import.progress.processing")}: {manualImportProgress.current} /{" "}
            {manualImportProgress.total}
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderCategorySelect = () => (
    <Box sx={{ mt: 2, mb: 2 }}>
      <TextField
        select
        fullWidth
        label="Add Categories to Imported Cards"
        value={selectedCategories}
        onChange={(e) =>
          setSelectedCategories(
            typeof e.target.value === "string"
              ? e.target.value.split(",")
              : e.target.value
          )
        }
        SelectProps={{
          multiple: true,
          renderValue: (selected) =>
            Array.isArray(selected) ? (selected as string[]).join(", ") : "",
        }}
      >
        {globalCategories.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        label="Add New Category"
        placeholder="Type and press Enter to add"
        sx={{ mt: 1 }}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
            const newCategory = (e.target as HTMLInputElement).value;
            await handleNewCategory(newCategory);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
    </Box>
  );

  const isValidEntry = () => {
    return (
      manualEntry.word.trim() !== "" &&
      manualEntry.partOfSpeech.trim() !== "" &&
      manualEntry.englishDefinition.trim() !== "" &&
      manualEntry.chineseTranslation.trim() !== ""
    );
  };

  const handleNewCategory = async (newCategory: string) => {
    if (
      !user ||
      !newCategory.trim() ||
      globalCategories.includes(newCategory)
    ) {
      return;
    }

    try {
      await addCategory(newCategory.trim(), user.uid);
      setGlobalCategories((prev) => [...prev, newCategory.trim()]);
      setSelectedCategories((prev) => [...prev, newCategory.trim()]);
    } catch (err) {
      setError("Failed to create new category");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {}, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxSize: 5 * 1024 * 1024,
  });

  const dropzoneStyles = {
    p: 3,
    border: "2px dashed",
    borderColor: isDragActive ? "primary.main" : "divider",
    bgcolor: isDragActive ? "action.hover" : "background.paper",
    cursor: "pointer",
    "&:hover": {
      bgcolor: "action.hover",
    },
  };

  const renderCategoryManagement = () => (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t("import.manual.categories")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        <FormControl sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel>{t("import.manual.categories")}</InputLabel>
          <Select
            multiple
            value={selectedCategories}
            onChange={handleCategoryChange}
            label={t("import.manual.categories")}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    size="small"
                    onDelete={() => {
                      const newCategories = selectedCategories.filter(
                        (cat) => cat !== value
                      );
                      setSelectedCategories(newCategories);
                    }}
                  />
                ))}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 48 * 4.5,
                },
              },
            }}
          >
            {globalCategories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            flex: { xs: "1", sm: "0 0 auto" },
          }}
        >
          <TextField
            label={t("import.manual.help.categories")}
            size="small"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                handleNewCategory((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
            sx={{ minWidth: 200 }}
            placeholder={t("import.manual.help.categories")}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const input = document.querySelector(
                'input[name="new-category"]'
              ) as HTMLInputElement;
              if (input?.value) {
                handleNewCategory(input.value);
                input.value = "";
              }
            }}
            sx={{ height: 40 }}
          >
            {t("common.save")}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const renderFileImport = () => (
    <Box>
      <Stepper
        activeStep={activeStep}
        sx={{
          mb: 3,
          flexWrap: "wrap",
          "& .MuiStep-root": {
            mb: { xs: 1, sm: 0 },
          },
        }}
      >
        <Step>
          <StepLabel>{t("import.steps.select")}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t("import.steps.preview")}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t("import.steps.import")}</StepLabel>
        </Step>
      </Stepper>

      {activeStep === 0 && (
        <>
          {renderCategoryManagement()}
          <Paper
            {...getRootProps()}
            sx={{
              p: 3,
              border: "2px dashed",
              borderColor: isDragActive ? "primary.main" : "divider",
              bgcolor: isDragActive ? "action.hover" : "background.paper",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                {t("import.dropzone.title")}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t("import.dropzone.accept")}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="textSecondary"
              >
                {t("import.dropzone.maxSize")}
              </Typography>
            </Box>
          </Paper>
        </>
      )}

      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("import.preview.title")}
          </Typography>
          {renderPreview()}
          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={() => setActiveStep(0)}>
              {t("import.actions.back")}
            </Button>
            <Button
              variant="contained"
              onClick={() => text && processCSV(text)}
              disabled={!text}
            >
              {t("import.actions.startImport")}
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {t("import.progress.title")}
          </Typography>
          {renderProgress()}
          {stats.processed === stats.total && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Import complete! Successfully imported {stats.success} cards
              {stats.failed > 0 && `, ${stats.failed} cards failed`}.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );

  const handleTranslationTest = async () => {
    try {
      const textToTranslate = `${manualEntry.word} (vocabulary word) - Definition: ${manualEntry.englishDefinition}`;
      const result = await translateToTraditionalChinese(textToTranslate);
    } catch (err) {
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ToggleButtonGroup
        value={importMode}
        exclusive
        onChange={(_, mode) => {
          if (mode) {
            setImportMode(mode);
            onModeChange(mode);
          }
        }}
        fullWidth
        sx={{
          display: "flex",
          ".MuiToggleButton-root": {
            flex: 1,
            py: 1.5,
          },
        }}
      >
        <ToggleButton value="file">{t("import.fileImport.title")}</ToggleButton>
        <ToggleButton value="manual">
          {t("import.manualEntry.title")}
        </ToggleButton>
      </ToggleButtonGroup>

      <Box>
        {importMode === "file" ? renderFileImport() : renderManualEntry()}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          elevation={6}
          variant="filled"
          sx={{
            width: "100%",
            maxWidth: "90vw",
            mb: { xs: 7, sm: 0 },
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
