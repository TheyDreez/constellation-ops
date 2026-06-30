"use client";
import { useState, useRef, useCallback } from "react";
import { Attachment } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import { Paperclip, Upload, X, FileText, Image, File, Download, Trash2 } from "lucide-react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith("image/")) return <Image size={14} style={{ color: "var(--brand)" }} />;
  if (mime === "application/pdf") return <FileText size={14} style={{ color: "#ef4444" }} />;
  return <File size={14} style={{ color: "var(--text-muted)" }} />;
}

interface Props {
  attachments: Attachment[];
  /** Deve resolver/rejeitar de acordo com o resultado real do upload — a UI
   * usa essa promise para saber quando parar de mostrar "enviando...". */
  onAdd: (file: File) => Promise<void>;
  onRemove?: (attachmentId: string) => Promise<void>;
  readOnly?: boolean;
}

export function AttachmentZone({ attachments, onAdd, onRemove, readOnly = false }: Props) {
  const [dragging, setDragging] = useState(false);
  // "uploading" reflete o estado real da chamada de rede, não um timer
  // decorativo — evita mostrar "concluído" antes da resposta do servidor
  // chegar (ou escondê-lo silenciosamente se o upload falhar).
  const [uploading, setUploading] = useState<{ name: string; error?: string }[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      setUploading((prev) => [...prev, { name: file.name }]);
      try {
        await onAdd(file);
        setUploading((prev) => prev.filter((e) => e.name !== file.name));
      } catch (e) {
        const message = e instanceof Error ? e.message : "Falha no envio";
        setUploading((prev) =>
          prev.map((entry) => (entry.name === file.name ? { ...entry, error: message } : entry))
        );
        // Remove a entrada com erro depois de um tempo, para não acumular
        // mensagens antigas indefinidamente na tela.
        setTimeout(() => {
          setUploading((prev) => prev.filter((e) => e.name !== file.name));
        }, 5000);
      }
    });
  }, [onAdd]);

  const handleRemove = useCallback(async (id: string) => {
    if (!onRemove) return;
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  }, [onRemove]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragging ? "var(--brand)" : "var(--border)",
            background: dragging ? "rgba(99,102,241,0.05)" : "var(--background-subtle)",
          }}
        >
          <Upload size={18} className="mx-auto mb-2" style={{ color: dragging ? "var(--brand)" : "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Arraste arquivos ou <span style={{ color: "var(--brand)" }}>clique para selecionar</span>
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>PDF, imagens, docs — até 10 MB</p>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>
      )}

      {/* Upload in progress (estado real, não simulado) */}
      {uploading.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            background: entry.error ? "var(--danger-light)" : "var(--background-subtle)",
            border: `1px solid ${entry.error ? "rgba(220,38,38,0.3)" : "var(--border)"}`,
          }}
        >
          {entry.error ? (
            <X size={13} style={{ color: "var(--danger)", flexShrink: 0 }} />
          ) : (
            <Upload size={13} className="animate-pulse" style={{ color: "var(--brand)", flexShrink: 0 }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{entry.name}</p>
            <p className="text-[10px]" style={{ color: entry.error ? "var(--danger)" : "var(--text-muted)" }}>
              {entry.error ?? "Enviando..."}
            </p>
          </div>
        </div>
      ))}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-3 rounded-lg group transition-colors"
              style={{ background: "var(--background-subtle)", border: "1px solid var(--border)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface)" }}>
                <FileIcon mime={att.mime_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{att.filename}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {formatBytes(att.size_bytes)} · {att.uploader?.name} · {formatRelativeDate(att.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded" style={{ color: "var(--text-muted)" }}>
                  <Download size={13} />
                </a>
                {onRemove && !readOnly && (
                  <button
                    onClick={() => handleRemove(att.id)}
                    disabled={removingId === att.id}
                    className="p-1 rounded disabled:opacity-50"
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && !uploading.length && readOnly && (
        <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Nenhum anexo</p>
      )}
    </div>
  );
}
