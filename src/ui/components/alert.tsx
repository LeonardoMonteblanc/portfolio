// src/ui/components/alert.tsx
"use client";

import * as React from "react";
import { cn } from "cn";
import { XIcon } from "lucide-react";

function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive";
}) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&>svg]:text-foreground",
        {
          "bg-muted text-muted-foreground": variant === "default",
          "bg-destructive/10 border-destructive/50 text-destructive dark:bg-destructive/20 dark:border-destructive/50":
            variant === "destructive",
        },
        className,
      )}
      role="alert"
      {...props}
    />
  );
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
