/**
 * @eagle/ui - Utility CSS Classes and Helpers
 * 
 * Common utility classes and CSS helpers for the Eagle UI system.
 */

// ============================================
// CLASS NAME UTILITIES
// ============================================

/**
 * Combines multiple class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Creates BEM-style class names
 */
export function bem(block: string, element?: string, modifier?: string | string[]): string {
  let className = block;
  
  if (element) {
    className += `__${element}`;
  }
  
  if (modifier) {
    if (Array.isArray(modifier)) {
      return modifier.map(m => `${className}--${m}`).join(' ');
    }
    return `${className}--${modifier}`;
  }
  
  return className;
}

// ============================================
// VARIANT MAPPINGS
// ============================================

export const buttonVariantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  success: 'btn-success',
  danger: 'btn-danger',
  warning: 'btn-warning',
  info: 'btn-info',
  'outline-primary': 'btn-outline-primary',
  'outline-secondary': 'btn-outline-secondary',
  'outline-danger': 'btn-outline-danger',
  ghost: 'btn-link',
};

export const buttonSizeClasses: Record<string, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const badgeVariantClasses: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  dark: 'bg-dark',
  light: 'bg-light text-dark',
};

export const alertTypeClasses: Record<string, string> = {
  success: 'alert-success',
  error: 'alert-danger',
  warning: 'alert-warning',
  info: 'alert-info',
};

export const alertIconClasses: Record<string, string> = {
  success: 'ti-check',
  error: 'ti-x',
  warning: 'ti-alert-triangle',
  info: 'ti-info-circle',
};

// ============================================
// SIZE MAPPINGS
// ============================================

export const inputSizeClasses: Record<string, string> = {
  sm: 'form-control-sm',
  md: '',
  lg: 'form-control-lg',
};

export const spinnerSizeClasses: Record<string, string> = {
  xs: 'spinner-border-sm',
  sm: 'spinner-border-sm',
  md: '',
  lg: 'spinner-border-lg',
};

export const avatarSizeStyles: Record<string, { width: string; height: string; fontSize: string }> = {
  xs: { width: '24px', height: '24px', fontSize: '10px' },
  sm: { width: '32px', height: '32px', fontSize: '12px' },
  md: { width: '40px', height: '40px', fontSize: '14px' },
  lg: { width: '48px', height: '48px', fontSize: '16px' },
  xl: { width: '64px', height: '64px', fontSize: '20px' },
};

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Generate initials from name
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

/**
 * Generate consistent color from string
 */
export function stringToColor(str: string): string {
  if (!str) return '#6c757d';
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#7367f0', '#00cfe8', '#28c76f', '#ff9f43', 
    '#ea5455', '#82868b', '#4b4b4b', '#00bcd4'
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// ============================================
// FORMAT UTILITIES
// ============================================

/**
 * Format number with separators
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format currency
 */
export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format date
 */
export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  },
  locale = 'en-US'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, options);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
