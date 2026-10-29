// src/ui/components/native-select.tsx
"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500",
            "dark:bg-gray-800 dark:border-gray-600 dark:text-white",
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";
