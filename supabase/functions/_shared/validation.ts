// Input validation utilities for edge functions
// Prevents injection attacks, data corruption, and malicious inputs

export interface ValidationError {
  field: string;
  message: string;
}

export function validateString(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {}
): ValidationError | null {
  if (value === undefined || value === null) {
    if (options.required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  const trimmedValue = value.trim();

  if (options.required && trimmedValue.length === 0) {
    return { field: fieldName, message: `${fieldName} cannot be empty` };
  }

  if (options.minLength && trimmedValue.length < options.minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${options.minLength} characters`,
    };
  }

  if (options.maxLength && trimmedValue.length > options.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${options.maxLength} characters`,
    };
  }

  if (options.pattern && !options.pattern.test(trimmedValue)) {
    return {
      field: fieldName,
      message: `${fieldName} contains invalid characters`,
    };
  }

  return null;
}

export function validateArray(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    maxLength?: number;
    itemValidator?: (item: any) => ValidationError | null;
  } = {}
): ValidationError | null {
  if (value === undefined || value === null) {
    if (options.required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (!Array.isArray(value)) {
    return { field: fieldName, message: `${fieldName} must be an array` };
  }

  if (options.maxLength && value.length > options.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${options.maxLength} items`,
    };
  }

  if (options.itemValidator) {
    for (let i = 0; i < value.length; i++) {
      const error = options.itemValidator(value[i]);
      if (error) {
        return {
          field: `${fieldName}[${i}]`,
          message: error.message,
        };
      }
    }
  }

  return null;
}

export function validateNumber(
  value: any,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationError | null {
  if (value === undefined || value === null) {
    if (options.required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { field: fieldName, message: `${fieldName} must be a number` };
  }

  if (options.integer && !Number.isInteger(num)) {
    return { field: fieldName, message: `${fieldName} must be an integer` };
  }

  if (options.min !== undefined && num < options.min) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${options.min}`,
    };
  }

  if (options.max !== undefined && num > options.max) {
    return {
      field: fieldName,
      message: `${fieldName} must not exceed ${options.max}`,
    };
  }

  return null;
}

export function validateUUID(
  value: any,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationError | null {
  if (value === undefined || value === null) {
    if (options.required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidPattern.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid UUID` };
  }

  return null;
}

export function sanitizeString(value: string): string {
  // Remove potential XSS vectors
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 10000); // Hard limit to prevent memory issues
}

export function sanitizeArray(value: any[]): any[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item))
    .slice(0, 100); // Limit array size
}
