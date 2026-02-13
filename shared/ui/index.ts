/**
 * @eagle/ui - Eagle B2B Platform Shared UI Components
 * 
 * This package provides reusable UI components that can be used
 * across Admin Panel, Accounts Portal, and other frontends.
 * 
 * Designed for consistency and reusability across the Eagle ecosystem.
 */

// ============================================
// BUTTON
// ============================================

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'danger' 
  | 'warning' 
  | 'info' 
  | 'outline-primary' 
  | 'outline-secondary'
  | 'outline-danger'
  | 'ghost';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children?: React.ReactNode;
}

// ============================================
// INPUT
// ============================================

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps {
  type?: InputType;
  size?: InputSize;
  label?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  className?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

// ============================================
// SELECT
// ============================================

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  onChange?: (value: string | number | null) => void;
}

// ============================================
// CARD
// ============================================

export interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  border?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ============================================
// TABLE
// ============================================

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: string;
  selectable?: boolean;
  selectedRows?: string[];
  onRowSelect?: (ids: string[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  rowKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  showQuickJumper?: boolean;
  disabled?: boolean;
  simple?: boolean;
  className?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

// ============================================
// MODAL
// ============================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

// ============================================
// TOAST / NOTIFICATION
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  position?: ToastPosition;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem extends ToastOptions {
  id: string;
}

// ============================================
// BADGE / STATUS
// ============================================

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pill?: boolean;
  dot?: boolean;
  count?: number;
  maxCount?: number;
  className?: string;
  children?: React.ReactNode;
}

// ============================================
// LOADING / SPINNER
// ============================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'primary' | 'secondary' | 'white';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

export interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  blur?: boolean;
  fullScreen?: boolean;
  className?: string;
}

// ============================================
// EMPTY STATE
// ============================================

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ============================================
// ALERT
// ============================================

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  closable?: boolean;
  icon?: string;
  onClose?: () => void;
  className?: string;
}

// ============================================
// TABS
// ============================================

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: number | string;
  content?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  onChange?: (key: string) => void;
}

// ============================================
// DROPDOWN
// ============================================

export interface DropdownItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  className?: string;
}

// ============================================
// AVATAR
// ============================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  color?: string;
  className?: string;
}

// ============================================
// SKELETON
// ============================================

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

// ============================================
// TOOLTIP
// ============================================

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

// ============================================
// PROGRESS
// ============================================

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  striped?: boolean;
  animated?: boolean;
  className?: string;
}

// ============================================
// BREADCRUMB
// ============================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: string | React.ReactNode;
  className?: string;
}

// ============================================
// FORM HELPERS
// ============================================

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface FormGroupProps {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

// ============================================
// UTILITY TYPES
// ============================================

export type ColorScheme = 'light' | 'dark' | 'auto';
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
}
