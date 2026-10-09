import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Trash2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface KBDoc {
  id: string;
  title: string;
  type: string;
  size: string;
}

interface KnowledgeBaseUploaderProps {
  documents?: KBDoc[];
}

export const KnowledgeBaseUploader: React.FC<KnowledgeBaseUploaderProps> = ({
  documents = [],
}) => {
  const { addToast } = useAppStore();
  const [docs, setDocs] = useState<KBDoc[]>(documents);
  const [isDragging, setIsDragging] = useState(false);

  // Sync docs if props change
  React.useEffect(() => {
    setDocs(documents);
  }, [documents]);

  const handleSimulatedUpload = (fileName: string, type: string) => {
    const newDoc: KBDoc = {
      id: `doc_${Date.now()}`,
      title: fileName,
      type,
      size: '1.4 MB',
    };
    setDocs((prev) => [newDoc, ...prev]);
    addToast({
      type: 'success',
      title: 'Document Ingested into Ground Truth',
      message: `${fileName} vector index compiled. Facts extracted for Veritas audit.`,
    });
  };

  const handleDelete = (id: string, title: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    addToast({
      type: 'info',
      title: 'Knowledge Record Removed',
      message: `${title} excised from trust verification vector database.`,
    });
  };

  const getDocIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'PDF') return <FileText className="w-4 h-4 text-danger stroke-[1.5]" />;
    if (t === 'XLSX' || t === 'CSV')
      return <FileSpreadsheet className="w-4 h-4 text-verified stroke-[1.5]" />;
    if (t === 'MD' || t === 'JSON')
      return <FileCode className="w-4 h-4 text-accent stroke-[1.5]" />;
    return <File className="w-4 h-4 text-text-muted stroke-[1.5]" />;
  };

  return (
    <Card variant="surface" className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="font-serif text-lg text-text font-normal">
            Verified Knowledge Base
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Only facts rooted in these approved documents can be referenced in outbound copy.
          </p>
        </div>
        <Badge variant="verified" size="sm">
          {docs.length} Active Records
        </Badge>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleSimulatedUpload('Master_Contract_Terms_2026.pdf', 'PDF');
        }}
        className={`border-2 border-dashed rounded-card p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-border/80 hover:border-accent/40 bg-surface-2/40'
        }`}
        onClick={() => handleSimulatedUpload('Enterprise_Compliance_Warranty.pdf', 'PDF')}
      >
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-3">
          <UploadCloud className="w-6 h-6 stroke-[1.5]" />
        </div>
        <div className="text-sm font-medium text-text">
          Drag & drop contract terms, pricing sheets, or certificates
        </div>
        <p className="text-xs text-text-muted mt-1">
          Supports PDF, Markdown, DOCX, XLSX (Max 25MB). Auto-chunked & verified.
        </p>

        <div className="mt-4">
          <span className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Upload File from Machine
          </span>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
          Audited Artifact Repository
        </span>

        {docs.length === 0 ? (
          <div className="p-4 rounded-[8px] bg-surface-2 text-center text-xs text-text-muted">
            No documents uploaded. The trust engine will mark all ungrounded claims as unverified.
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-[8px] bg-surface-2/70 border border-border text-xs hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[6px] bg-surface border border-border flex items-center justify-center flex-shrink-0">
                    {getDocIcon(doc.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-text font-medium truncate">{doc.title}</div>
                    <div className="text-[10px] text-text-faint font-mono mt-0.5">
                      {doc.type} • {doc.size} • Cryptographically Indexed
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-verified flex items-center gap-1 font-mono text-[10px]">
                    <CheckCircle2 className="w-3 h-3 stroke-[1.5]" />
                    VERIFIED
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1 text-text-faint hover:text-danger rounded hover:bg-surface transition-colors cursor-pointer"
                    aria-label={`Remove document ${doc.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
