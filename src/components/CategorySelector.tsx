import React, { useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FlashcardCounter } from '../types';

interface Props {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  label?: string;
  placeholder?: string;
  allCategoriesLabel?: string;
  noOptionsText?: string;
  loading?: boolean;
}

export const CategorySelector: React.FC<Props> = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  label = 'Category',
  placeholder = 'Select category',
  allCategoriesLabel = 'All Categories',
  noOptionsText = 'No categories available'
}) => {
  const theme = useTheme();

  const transformedCategories = useMemo(() => {
    return categories.sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onCategoryChange(event.target.value === 'all' ? null : event.target.value);
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={selectedCategory || 'all'}
        onChange={handleChange}
        label={label}
        displayEmpty
        placeholder={placeholder}
      >
        <MenuItem value="all">{allCategoriesLabel}</MenuItem>
        {categories.length > 0 ? (
          categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>{noOptionsText}</MenuItem>
        )}
      </Select>
    </FormControl>
  );
};