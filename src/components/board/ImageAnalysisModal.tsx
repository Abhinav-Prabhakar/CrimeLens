'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Sparkles, Check, AlertCircle, Upload } from 'lucide-react';
import { BoardCardType, EntityType } from '@/lib/types/investigation';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  caseContextNote?: string;
  onClose: () => void;
  onAddEvidence: (entity: {
    label: string;
    type: EntityType;
    visualType: BoardCardType;
    confidence: number;
    notes: string;
  }) => void;
}

interface VisionResult {
  classification: string;
  description: string;
  licensePlate?: string | null;
  vehicleDetails?: string | null;
  forensicDetails?: string | null;
  confidence: number;
  uncertainty: string;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  caseContextNote,
  onClose,
  onAddEvidence,
}) => {
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string; objectUrl: string; fileName: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [stagingLabel, setStagingLabel] = useState('');
  const [stagingNotes, setStagingNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    if (imageData?.objectUrl) URL.revokeObjectURL(imageData.objectUrl);
    setImageData(null);
    setResult(null);
    setErrorMsg('');
    setStagingLabel('');
    setStagingNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Only image files (JPG / PNG / WEBP) are accepted as forensic specimens.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg(`Image exceeds the 4 MB upload limit (${(file.size / 1024 / 1024).toFixed(1)} MB). Downscale and retry.`);
      return;
    }
    setErrorMsg('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const objectUrl = URL.createObjectURL(file);
      setImageData({
        base64: (reader.result as string).split(',')[1] || '',
        mimeType: file.type,
        objectUrl,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    if (!imageData) return;
    setAnalyzing(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mimeType: imageData.mimeType,
          contextNote: caseContextNote,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Vision analysis failed');
      }
      const data: VisionResult = json.data;
      setResult(data);
      setStagingLabel(data.licensePlate ? `${data.classification} (${data.licensePlate})` : data.classification);
      setStagingNotes(
        [
          `Specimen: ${imageData.fileName}`,
          data.description,
          data.vehicleDetails ? `Vehicle: ${data.vehicleDetails}` : '',
          data.forensicDetails ? `Forensic: ${data.forensicDetails}` : '',
          `Uncertainty: ${data.uncertainty}`,
        ]
          .filter(Boolean)
          .join('\n')
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Forensic vision gateway unreachable.');
    } finally {
      setAnalyzing(false);
    }
  };

  const inferType = (r: VisionResult): EntityType => {
    const c = `${r.classification} ${r.vehicleDetails || ''}`.toLowerCase();
    if (r.licensePlate || /vehicle|sedan|car|truck|van|motorcycle/.test(c)) return 'vehicle';
    if (/fingerprint|latent|print/.test(c)) return 'evidence_item';
    if (/person|suspect|individual/.test(c)) return 'person';
    return 'evidence_item';
  };

  const inferVisual = (r: VisionResult): BoardCardType => {
    const c = `${r.classification} ${r.vehicleDetails || ''}`.toLowerCase();
    if (r.licensePlate || /vehicle|sedan|car|truck/.test(c)) return 'map';
    if (/fingerprint|latent/.test(c)) return 'print';
    if (/tool|lockpick|kit|weapon/.test(c)) return 'bag';
    return 'photo';
  };

  const handleCommit = () => {
    if (!result) return;
    onAddEvidence({
      label: stagingLabel || result.classification,
      type: inferType(result),
      visualType: inferVisual(result),
      confidence: result.confidence,
      notes: stagingNotes,
    });
    reset();
    onClose();
  };

  return (
    <div className="cb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cb-dossier w-full max-w-2xl max-h-[90vh] flex flex-col font-sans text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="cb-dossier-head flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="cb-row-icon text-crimson">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Forensic Image & Object Analysis
              </h2>
              <p className="cb-dim text-[11px]">
                Real multimodal inference (Groq vision). Results are staged for investigator confirmation — never auto-committed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="cb-btn cb-btn-ghost cb-btn-icon"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="cb-dossier-body cb-scroll flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {/* Upload zone */}
          {!imageData ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className="p-10 border-2 border-dashed border-noir-600 rounded-md flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:border-crimson-dim transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="cb-empty-icon">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-noir-100">Upload evidence specimen</div>
                <p className="cb-dim text-[11px] mt-1">
                  Drag & drop or click — CCTV stills, surveillance photos, forensic macro shots (max 4 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="cb-eyebrow">Specimen Preview</span>
                  <button
                    onClick={reset}
                    className="cb-btn cb-btn-ghost cb-btn-sm"
                  >
                    Choose different image
                  </button>
                </div>
                <div className="cb-card p-2 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageData.objectUrl}
                    alt={imageData.fileName}
                    className="max-h-64 rounded object-contain"
                  />
                </div>
                <div className="cb-faint cb-mono text-[10px]">
                  {imageData.fileName} · {(imageData.base64.length / 1024 / 1.37).toFixed(0)} KB
                </div>
              </div>

              {/* Analysis result staging */}
              {result && (
                <div className="cb-card cb-card-pad space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="cb-amber cb-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Visual Object Detection Report
                    </span>
                    <span className="cb-badge cb-badge-green flex-shrink-0">
                      {(result.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-noir-200 text-[12px] leading-relaxed">{result.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {result.licensePlate && (
                      <div className="cb-metric p-2">
                        <span className="cb-faint cb-mono text-[9px] uppercase tracking-widest">Plate Read</span>
                        <div className="cb-mono font-bold text-crimson">{result.licensePlate}</div>
                      </div>
                    )}
                    {result.vehicleDetails && (
                      <div className="cb-metric p-2">
                        <span className="cb-faint cb-mono text-[9px] uppercase tracking-widest">Vehicle Estimate</span>
                        <div className="text-noir-200">{result.vehicleDetails}</div>
                      </div>
                    )}
                    {result.forensicDetails && (
                      <div className="cb-metric p-2 col-span-2">
                        <span className="cb-faint cb-mono text-[9px] uppercase tracking-widest">Forensic Markings</span>
                        <div className="text-noir-200">{result.forensicDetails}</div>
                      </div>
                    )}
                  </div>
                  <hr className="cb-divider" />
                  <div className="cb-faint text-[10px]">
                    Uncertainty statement: {result.uncertainty}
                  </div>

                  {/* Human-in-the-loop staging fields */}
                  <div className="space-y-2 pt-2 border-t border-noir-700">
                    <span className="cb-field-label cb-amber !mb-0">
                      Investigator review (edit before pinning)
                    </span>
                    <input
                      type="text"
                      value={stagingLabel}
                      onChange={(e) => setStagingLabel(e.target.value)}
                      className="cb-input"
                      placeholder="Evidence label"
                    />
                    <textarea
                      rows={3}
                      value={stagingNotes}
                      onChange={(e) => setStagingNotes(e.target.value)}
                      className="cb-textarea cb-mono text-[11px]"
                      placeholder="Evidence notes"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="cb-alert cb-alert-red">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="cb-dossier-foot flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="cb-btn cb-btn-ghost"
          >
            Cancel
          </button>
          {!result ? (
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !imageData}
              className="cb-btn cb-btn-primary"
            >
              {analyzing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" /> Running multimodal inference...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Run Forensic Analysis
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCommit}
              className="cb-btn cb-btn-primary"
            >
              <Check className="w-4 h-4" /> Pin to Corkboard & Graph (AI-Inferred)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
