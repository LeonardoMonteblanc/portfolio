// src/ui/components/share-button.tsx
"use client";

import { forwardRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/ui/components/button";

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

    /**
     * A checagem do Web Share API PRECISA ficar no efeito.
     *
     * Antes ela chamava `setShareSupported` durante o render: isso re-renderiza
     * a cada render, entra em loop e o React aborta a página com "Too many
     * re-renders" (#301) — a página do negócio caía para o visitante no
     * navegador. No efeito, o HTML do servidor e o primeiro render do cliente
     * continuam iguais (sem mismatch de hidratação) e a capacidade só é
     * aplicada depois de montar.
     */
    useEffect(() => {
      setShareSupported(
        typeof navigator !== "undefined" && navigator.share !== undefined,
      );
    }, []);

    const copyToClipboard = useCallback(async () => {
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
    }, [url]);

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
            await copyToClipboard();
          }
        }
      } else {
        await copyToClipboard();
      }
    }, [url, title, text, shareSupported, copyToClipboard]);

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
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline ml-1">
          {copied ? "Copiado!" : "Compartilhar"}
        </span>
      </Button>
    );
  },
);

ShareButton.displayName = "ShareButton";
