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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Forensic Image & Object Analysis
              </h2>
              <p className="text-[11px] text-noir-400">
                Real multimodal inference (Groq vision). Results are staged for investigator confirmation — never auto-committed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="text-noir-400 hover:text-noir-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Upload zone */}
          {!imageData ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className="p-10 bg-noir-950 border-2 border-dashed border-noir-700 rounded-xl flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:border-crimson/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-lg bg-noir-850 border border-noir-700 flex items-center justify-center text-noir-500">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <div className="font-bold text-noir-100">Upload evidence specimen</div>
                <p className="text-noir-400 text-[11px] mt-1">
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
                  <span className="text-[10px] uppercase text-noir-400">Specimen Preview</span>
                  <button
                    onClick={reset}
                    className="text-[10px] text-noir-400 hover:text-crimson underline underline-offset-2"
                  >
                    choose different image
                  </button>
                </div>
                <div className="p-2 bg-noir-950 border border-noir-800 rounded-xl flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageData.objectUrl}
                    alt={imageData.fileName}
                    className="max-h-64 rounded-lg object-contain"
                  />
                </div>
                <div className="text-[10px] text-noir-500">
                  {imageData.fileName} · {(imageData.base64.length / 1024 / 1.37).toFixed(0)} KB
                </div>
              </div>

              {/* Analysis result staging */}
              {result && (
                <div className="p-4 bg-noir-850 rounded-xl border border-noir-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-accent flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4" /> VISUAL OBJECT DETECTION REPORT
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold rounded text-[10px]">
                      {(result.confidence * 100).toFixed(0)}% CONFIDENCE
                    </span>
                  </div>
                  <p className="text-noir-200 text-[11px] leading-relaxed">{result.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {result.licensePlate && (
                      <div className="p-2 bg-noir-950 rounded border border-noir-800">
                        <span className="text-noir-500 uppercase">Plate Read</span>
                        <div className="font-bold text-crimson">{result.licensePlate}</div>
                      </div>
                    )}
                    {result.vehicleDetails && (
                      <div className="p-2 bg-noir-950 rounded border border-noir-800">
                        <span className="text-noir-500 uppercase">Vehicle Estimate</span>
                        <div className="text-noir-200">{result.vehicleDetails}</div>
                      </div>
                    )}
                    {result.forensicDetails && (
                      <div className="p-2 bg-noir-950 rounded border border-noir-800 col-span-2">
                        <span className="text-noir-500 uppercase">Forensic Markings</span>
                        <div className="text-noir-200">{result.forensicDetails}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-noir-400 pt-1 border-t border-noir-800">
                    Uncertainty statement: {result.uncertainty}
                  </div>

                  {/* Human-in-the-loop staging fields */}
                  <div className="space-y-2 pt-2 border-t border-noir-800">
                    <span className="text-[10px] uppercase text-amber-accent font-bold">
                      Investigator review (edit before pinning)
                    </span>
                    <input
                      type="text"
                      value={stagingLabel}
                      onChange={(e) => setStagingLabel(e.target.value)}
                      className="w-full bg-noir-900 border border-noir-700 rounded px-2.5 py-1.5 text-noir-100 focus:border-crimson focus:outline-none"
                      placeholder="Evidence label"
                    />
                    <textarea
                      rows={3}
                      value={stagingNotes}
                      onChange={(e) => setStagingNotes(e.target.value)}
                      className="w-full bg-noir-900 border border-noir-700 rounded p-2 text-[10px] text-noir-200 focus:border-crimson focus:outline-none"
                      placeholder="Evidence notes"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-crimson/10 border border-crimson/40 rounded text-crimson flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-noir-850 border-t border-noir-700">
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="px-4 py-2 text-noir-400 hover:text-noir-200"
          >
            Cancel
          </button>
          {!result ? (
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || !imageData}
              className="px-5 py-2 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white rounded font-bold flex items-center gap-2 transition-colors"
            >
              {analyzing ? (
                <>
                  <span className="animate-spin">⚙</span> Running multimodal inference...
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
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold flex items-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" /> Pin to Corkboard & Graph (AI-Inferred)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
