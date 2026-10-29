// src/ui/components/image-upload.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useActionState } from "react";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Progress } from "@/ui/components/progress";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert";
import {
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseUploadedFile {
  key: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  preview?: string;
}

interface ImageUploadedFile extends BaseUploadedFile {
  tipo: "logo" | "foto";
}

interface FileUploadedFile extends BaseUploadedFile {
  nomeOriginal: string;
}

type UploadedFile = ImageUploadedFile | FileUploadedFile;

interface ImageUploadProps {
  label?: string;
  description?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  tipo?: "logo" | "foto";
  solicitacaoId?: string;
  onUploadComplete?: (files: ImageUploadedFile[]) => void;
  initialFiles?: ImageUploadedFile[];
  disabled?: boolean;
}

interface FileUploadProps {
  label?: string;
  description?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  solicitacaoId?: string;
  onUploadComplete?: (files: FileUploadedFile[]) => void;
  initialFiles?: FileUploadedFile[];
  disabled?: boolean;
}

export function ImageUpload({
  label = "Imagens",
  description = "Arraste ou clique para adicionar imagens (JPEG, PNG, WebP - máx 5MB)",
  maxFiles = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMB = 5,
  tipo = "foto",
  solicitacaoId,
  onUploadComplete,
  initialFiles = [],
  disabled = false,
}: ImageUploadProps) {
  const [files, setFiles] = useState<ImageUploadedFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionState, formAction] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      // This will be replaced by the actual server action
      return { error: "Not implemented" };
    },
    null,
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `Formato inválido: ${file.name}. Use ${acceptedTypes.join(", ")}.`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Arquivo muito grande: ${file.name}. Máximo ${maxSizeMB}MB.`;
      }
      return null;
    },
    [acceptedTypes, maxSizeMB],
  );

  const handleFileSelect = useCallback(
    async (selectedFiles: FileList) => {
      const newFiles = Array.from(selectedFiles);
      const errors: string[] = [];
      const validFiles: ImageUploadedFile[] = [];

      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
          continue;
        }

        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Limite de ${maxFiles} arquivos atingido.`);
          break;
        }

        // Create preview
        const preview = URL.createObjectURL(file);
        validFiles.push({
          key: "",
          url: "",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          preview,
          tipo,
        });
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        setError("");
      }
    },
    [files.length, maxFiles, tipo, validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      if (!file) return prev;
      if (file.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadFiles = useCallback(async () => {
    const filesToUpload = files.filter((f) => !f.key); // Only upload new files
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setError("");

    try {
      // Get presigned URLs for all files
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append("solicitacaoId", solicitacaoId || "");
        formData.append("tipo", tipo);
        formData.append("fileName", file.fileName);
        formData.append("fileType", file.fileType);
        formData.append("fileSize", String(file.fileSize));

        // Note: In a real implementation, we'd call the server action here
        // For now, we'll simulate the response
        return {
          ...file,
          key: `temp/${Date.now()}-${file.fileName}`,
          url: file.preview || "",
        };
      });

      const results = await Promise.all(uploadPromises);

      setFiles((prev) =>
        prev.map((f) => {
          const result = results.find(
            (r) => r.fileName === f.fileName && !r.key,
          );
          return result ? { ...f, key: result.key, url: result.url } : f;
        }),
      );

      if (onUploadComplete) {
        onUploadComplete(
          files.map((f) => {
            const result = results.find((r) => r.fileName === f.fileName);
            return result ? { ...f, key: result.key, url: result.url } : f;
          }),
        );
      }
    } catch (err) {
      setError("Falha ao fazer upload das imagens");
    } finally {
      setUploading(false);
    }
  }, [files, solicitacaoId, tipo, onUploadComplete]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files);
        e.target.value = "";
      }
    },
    [handleFileSelect],
  );

  return (
    <div className="space-y-4">
      <Label htmlFor="image-upload" className="block text-sm font-medium">
        {label}
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          "border-border bg-background hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={disabled ? undefined : triggerFileInput}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            triggerFileInput();
          }
        }}
      >
        <input
          ref={fileInputRef}
          id="image-upload"
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || files.length >= maxFiles}
          aria-label={`Upload de ${label.toLowerCase()}`}
        />
        <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          {disabled
            ? "Upload desabilitado"
            : files.length >= maxFiles
              ? `Limite de ${maxFiles} imagens atingido`
              : `Clique ou arraste até ${maxFiles} imagens`}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {acceptedTypes.join(", ")} • até {maxSizeMB}MB cada
        </p>
      </div>

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {file.preview && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/90 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(file.preview!, "_blank")}
                    aria-label="Visualizar imagem"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                )}
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-white/90 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    aria-label="Remover imagem"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {file.key && (
                <div className="absolute bottom-1 right-1">
                  <CheckCircle className="h-4 w-4 text-green-500 bg-white/90 rounded-full" />
                </div>
              )}
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 rounded truncate max-w-[80px]">
                {file.fileName}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.filter((f) => !f.key).length > 0 && !uploading && (
        <div className="flex justify-end">
          <Button onClick={uploadFiles} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Fazer Upload"
            )}
          </Button>
        </div>
      )}

      {uploading && <Progress value={50} className="h-2" />}

      <p className="text-xs text-muted-foreground">
        {files.length}/{maxFiles} imagens selecionadas
      </p>
    </div>
  );
}

export function FileUpload({
  label = "Anexos",
  description = "Arraste ou clique para adicionar documentos (PDF, DOC, DOCX - máx 10MB)",
  maxFiles = 5,
  acceptedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  maxSizeMB = 10,
  solicitacaoId,
  onUploadComplete,
  initialFiles = [],
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadedFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("doc")) return "📝";
    return "📎";
  };

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `Formato inválido: ${file.name}. Use ${acceptedTypes.join(", ")}.`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Arquivo muito grande: ${file.name}. Máximo ${maxSizeMB}MB.`;
      }
      return null;
    },
    [acceptedTypes, maxSizeMB],
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList) => {
      const newFiles = Array.from(selectedFiles);
      const errors: string[] = [];
      const validFiles: FileUploadedFile[] = [];

      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
          continue;
        }

        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Limite de ${maxFiles} arquivos atingido.`);
          break;
        }

        validFiles.push({
          key: "",
          url: "",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          nomeOriginal: file.name,
        });
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        setError("");
      }
    },
    [files.length, maxFiles, validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files);
        e.target.value = "";
      }
    },
    [handleFileSelect],
  );

  return (
    <div className="space-y-4">
      <Label htmlFor="file-upload" className="block text-sm font-medium">
        {label}
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          "border-border bg-background hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={disabled ? undefined : triggerFileInput}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            triggerFileInput();
          }
        }}
      >
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || files.length >= maxFiles}
          aria-label={`Upload de ${label.toLowerCase()}`}
        />
        <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          {disabled
            ? "Upload desabilitado"
            : files.length >= maxFiles
              ? `Limite de ${maxFiles} arquivos atingido`
              : `Clique ou arraste até ${maxFiles} documentos`}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          PDF, DOC, DOCX • até {maxSizeMB}MB cada
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 group"
            >
              <span className="text-2xl">{getFileIcon(file.fileType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  aria-label="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {files.length}/{maxFiles} arquivos selecionados
      </p>
    </div>
  );
}
