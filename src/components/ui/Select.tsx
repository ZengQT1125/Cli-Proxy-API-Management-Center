import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from './icons';
import styles from './Select.module.scss';
import { useAnchoredDropdown } from './useAnchoredDropdown';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: ReadonlyArray<SelectOption>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  fullWidth?: boolean;
  id?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  moreResultsMessage?: string;
  maxVisibleOptions?: number;
  triggerClassName?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder,
  className,
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  fullWidth = true,
  id,
  searchable = false,
  searchPlaceholder,
  emptyMessage,
  moreResultsMessage,
  maxVisibleOptions = 100,
  triggerClassName,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = open && !disabled;
  const dropdownStyle = useAnchoredDropdown(wrapRef, isOpen);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
  }, []);

  const openDropdown = useCallback(() => {
    setSearchQuery('');
    setHighlightedIndex(-1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open || disabled) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      closeDropdown();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdown, disabled, open]);

  useEffect(() => {
    if (!isOpen || !searchable) return;
    searchInputRef.current?.focus();
  }, [isOpen, searchable]);

  const matchingOptions = useMemo(() => {
    if (!searchable) return options;
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.label.toLocaleLowerCase().includes(query) ||
        option.value.toLocaleLowerCase().includes(query)
    );
  }, [options, searchQuery, searchable]);

  const visibleOptions = useMemo(() => {
    if (!searchable) return matchingOptions;
    return matchingOptions.slice(0, Math.max(1, maxVisibleOptions));
  }, [matchingOptions, maxVisibleOptions, searchable]);

  const selectedIndex = useMemo(
    () => visibleOptions.findIndex((option) => option.value === value),
    [value, visibleOptions]
  );
  const resolvedHighlightedIndex =
    highlightedIndex >= 0
      ? highlightedIndex
      : selectedIndex >= 0
        ? selectedIndex
        : visibleOptions.length > 0
          ? 0
          : -1;
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );
  const displayText = selected?.label ?? placeholder ?? '';
  const isPlaceholder = !selected && placeholder;

  const commitSelection = useCallback(
    (nextIndex: number) => {
      const nextOption = visibleOptions[nextIndex];
      if (!nextOption) return;
      onChange(nextOption.value);
      closeDropdown();
      setHighlightedIndex(nextIndex);
      triggerRef.current?.focus();
    },
    [closeDropdown, onChange, visibleOptions]
  );

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (visibleOptions.length === 0) return;
      const nextIndex =
        (resolvedHighlightedIndex + direction + visibleOptions.length) % visibleOptions.length;
      setHighlightedIndex(nextIndex);
    },
    [resolvedHighlightedIndex, visibleOptions.length]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            openDropdown();
            return;
          }
          moveHighlight(1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            openDropdown();
            return;
          }
          moveHighlight(-1);
          return;
        case 'Home':
          if (!isOpen || visibleOptions.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(0);
          return;
        case 'End':
          if (!isOpen || visibleOptions.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(visibleOptions.length - 1);
          return;
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (!isOpen) {
            openDropdown();
            return;
          }
          if (resolvedHighlightedIndex >= 0) {
            commitSelection(resolvedHighlightedIndex);
          }
          return;
        }
        case 'Escape':
          if (!isOpen) return;
          event.preventDefault();
          closeDropdown();
          return;
        case 'Tab':
          if (isOpen) closeDropdown();
          return;
        default:
          return;
      }
    },
    [
      closeDropdown,
      commitSelection,
      disabled,
      isOpen,
      moveHighlight,
      openDropdown,
      resolvedHighlightedIndex,
      visibleOptions.length,
    ]
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveHighlight(1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveHighlight(-1);
          return;
        case 'Home':
          if (visibleOptions.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(0);
          return;
        case 'End':
          if (visibleOptions.length === 0) return;
          event.preventDefault();
          setHighlightedIndex(visibleOptions.length - 1);
          return;
        case 'Enter':
          if (resolvedHighlightedIndex < 0) return;
          event.preventDefault();
          commitSelection(resolvedHighlightedIndex);
          return;
        case 'Escape':
          event.preventDefault();
          closeDropdown();
          triggerRef.current?.focus();
          return;
        case 'Tab':
          closeDropdown();
          return;
        default:
          return;
      }
    },
    [closeDropdown, commitSelection, moveHighlight, resolvedHighlightedIndex, visibleOptions.length]
  );

  useEffect(() => {
    if (!isOpen || resolvedHighlightedIndex < 0) return;
    const highlightedOption = document.getElementById(
      `${selectId}-option-${resolvedHighlightedIndex}`
    );
    highlightedOption?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, resolvedHighlightedIndex, selectId]);

  const dropdown =
    isOpen && dropdownStyle ? (
      <div ref={dropdownRef} className={styles.dropdown} style={dropdownStyle}>
        {searchable && (
          <div className={styles.searchWrap}>
            <input
              ref={searchInputRef}
              type="search"
              className={styles.searchInput}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder ?? ariaLabel}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                resolvedHighlightedIndex >= 0
                  ? `${selectId}-option-${resolvedHighlightedIndex}`
                  : undefined
              }
            />
          </div>
        )}
        <div className={styles.optionsList} id={listboxId} role="listbox" aria-label={ariaLabel}>
          {visibleOptions.map((opt, index) => {
            const active = opt.value === value;
            const highlighted = index === resolvedHighlightedIndex;
            return (
              <button
                key={opt.value}
                id={`${selectId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`${styles.option} ${active ? styles.optionActive : ''} ${highlighted ? styles.optionHighlighted : ''}`.trim()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onKeyDown={handleKeyDown}
                onClick={() => commitSelection(index)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {visibleOptions.length === 0 && emptyMessage && (
          <div className={styles.dropdownMessage} role="status">
            {emptyMessage}
          </div>
        )}
        {matchingOptions.length > visibleOptions.length && moreResultsMessage && (
          <div className={styles.dropdownMessage} role="status">
            {moreResultsMessage}
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <div
        className={`${styles.wrap} ${fullWidth ? styles.wrapFullWidth : ''} ${className ?? ''}`}
        ref={wrapRef}
      >
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          className={`${styles.trigger} ${triggerClassName ?? ''}`.trim()}
          onClick={disabled ? undefined : () => (isOpen ? closeDropdown() : openDropdown())}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={
            !searchable && isOpen && resolvedHighlightedIndex >= 0
              ? `${selectId}-option-${resolvedHighlightedIndex}`
              : undefined
          }
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
        >
          <span className={`${styles.triggerText} ${isPlaceholder ? styles.placeholder : ''}`}>
            {displayText}
          </span>
          <span className={styles.triggerIcon} aria-hidden="true">
            <IconChevronDown size={14} />
          </span>
        </button>
      </div>
      {dropdown &&
        (typeof document === 'undefined' ? dropdown : createPortal(dropdown, document.body))}
    </>
  );
}
