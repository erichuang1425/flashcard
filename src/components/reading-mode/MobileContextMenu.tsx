import React, { useEffect } from 'react';

interface Props {
  onLookup: (word: string) => void;
}

export const MobileContextMenu: React.FC<Props> = ({ onLookup }) => {
  useEffect(() => {
    let selection: Selection | null;
    let selectedRange: Range | null;

    const handleSelection = (e: TouchEvent) => {
      // Delay check to allow selection to complete
      setTimeout(() => {
        selection = window.getSelection();
        if (!selection?.toString().trim()) return;
        
        selectedRange = selection.getRangeAt(0);
        const text = selection.toString().trim();
        
        // Only handle single word selections
        if (text.split(/\s+/).length === 1) {
          // Create floating menu
          const menu = document.createElement('div');
          menu.className = 'mobile-context-menu';
          menu.style.position = 'fixed';
          menu.style.zIndex = '9999';
          // Add accessibility roles
          menu.setAttribute('role', 'menu');
          menu.setAttribute('aria-label', 'Word options');
          menu.setAttribute('aria-live', 'assertive');
          
          // Position near selection
          const rect = selectedRange.getBoundingClientRect();
          menu.style.left = `${rect.left}px`;
          menu.style.top = `${rect.bottom + window.scrollY + 10}px`;
          
          // Add lookup button
          const lookupBtn = document.createElement('button');
          lookupBtn.textContent = 'Look Up';
          lookupBtn.setAttribute('aria-label', `Look up ${text}`);
          lookupBtn.setAttribute('role', 'menuitem');
          lookupBtn.onclick = () => {
            onLookup(text);
            menu.remove();
          };

          lookupBtn.tabIndex = 0;
          
          menu.appendChild(lookupBtn);
          document.body.appendChild(menu);
          lookupBtn.focus();
          
          // Auto-remove after delay
          setTimeout(() => menu.remove(), 3000);
        }
      }, 100);
    };

    // Use both touchend and selectionchange for better iOS compatibility
    document.addEventListener('touchend', handleSelection, { passive: true });
    document.addEventListener('selectionchange', () => {
      // Clear previous menus
      document.querySelectorAll('.mobile-context-menu').forEach(el => el.remove());
    });

    return () => {
      document.removeEventListener('touchend', handleSelection);
      document.querySelectorAll('.mobile-context-menu').forEach(el => el.remove());
    };
  }, [onLookup]);

  return null;
};