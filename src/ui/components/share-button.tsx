// src/ui/components/share-button.tsx
"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/ui/components/button";
import { useState, useCallback } from "react";

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
  (
    {
      url,
      title,
      text,
      className,
      variant = "outline",
      size = "default",
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = useState(false);
    const [shareSupported, setShareSupported] = useState(false);

    // Verificar suporte ao Web Share API
    if (typeof window !== "undefined") {
      setShareSupported(navigator.share !== undefined);
    }

    const handleShare = useCallback(async () => {
      const shareData = {
        title: title || document.title,
        text: text || "",
        url,
      };

      if (shareSupported && navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            // Fallback para copiar link
            await copyToClipboard();
          }
        }
      } else {
        await copyToClipboard();
      }
    }, [url, title, text, shareSupported]);

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback para navegadores sem clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={handleShare}
        className={cn(className)}
        aria-label="Compartilhar"
        {...props}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            <span className="sr-only">Link copiado</span>
          </>
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        <span className="hidden sm:inline ml-1">
          {copied ? "Copiado!" : "Compartilhar"}
        </span>
      </Button>
    );
  },
);

ShareButton.displayName = "ShareButton";
