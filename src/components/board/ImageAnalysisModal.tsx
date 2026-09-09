'use client';

import React, { useState } from 'react';
import { X, Camera, Sparkles, Check, AlertCircle, Eye, Shield } from 'lucide-react';
import { BoardCardType, EntityType } from '@/lib/types/investigation';

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvidence: (entity: {
    label: string;
    type: EntityType;
    visualType: BoardCardType;
    confidence: number;
    notes: string;
  }) => void;
}

const SAMPLE_IMAGES = [
  {
    title: 'Pier 9 CCTV Still #Cam-04',
    desc: 'Low-light CCTV capture of getaway vehicle departing south pier basin.',
    detected: 'Sedan Vehicle (Honda Civic 2018-2021 Model: 78% probability, Crimson Red finish)',
    type: 'vehicle' as EntityType,
    visualType: 'map' as BoardCardType,
    confidence: 0.86,
  },
  {
    title: 'Latent Fingerprint #LP-4 Macro Photomicrograph',
    desc: 'Recovered from discarded steel shackle under Sector 4 floodlight.',
    detected: 'Right Hand Index Finger Whorl / Loop (14 minutiae ridge points matched)',
    type: 'evidence_item' as EntityType,
    visualType: 'print' as BoardCardType,
    confidence: 0.96,
  },
  {
    title: 'Seized Tooling (Titanium Lockpick & Torch)',
    desc: 'High-tensile German custom lockpick set with thermal soot residue.',
    detected: 'Burglary Breaching Kit (Specialized high-tensile picks, cobalt exterior markings)',
    type: 'evidence_item' as EntityType,
    visualType: 'bag' as BoardCardType,
    confidence: 0.94,
  },
];

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAddEvidence,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  if (!isOpen) return null;

  const currentSample = SAMPLE_IMAGES[selectedIdx];

  const handleRunAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalysisDone(true);
    }, 600);
  };

  const handleCommit = () => {
    onAddEvidence({
      label: currentSample.title,
      type: currentSample.type,
      visualType: currentSample.visualType,
      confidence: currentSample.confidence,
      notes: `${currentSample.desc}\nAnalysis: ${currentSample.detected}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-noir-900 border border-noir-700 rounded-xl shadow-2xl flex flex-col font-mono text-xs text-noir-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-noir-850 border-b border-noir-700">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-crimson" />
            <div>
              <h2 className="text-sm font-bold text-noir-100 uppercase tracking-wider">
                Forensic Image & Object Analysis
              </h2>
              <p className="text-[11px] text-noir-400">
                Visual evidence classification, vehicle license plate identification, and latent print triage.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-noir-400 hover:text-noir-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Sample selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-noir-400 uppercase">Select Forensic Image Specimen:</span>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_IMAGES.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setAnalysisDone(false);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedIdx === idx
                      ? 'bg-crimson/20 border-crimson text-noir-100'
                      : 'bg-noir-950 border-noir-800 text-noir-400 hover:text-noir-200'
                  }`}
                >
                  <div className="font-bold text-[11px] truncate">{img.title}</div>
                  <div className="text-[9px] uppercase mt-0.5">{img.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Image Preview Simulated Box */}
          <div className="p-6 bg-noir-950 border border-noir-800 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-20 h-20 rounded-lg bg-noir-850 border border-noir-700 flex items-center justify-center text-noir-400">
              <Camera className="w-8 h-8 text-crimson/80" />
            </div>
            <div>
              <div className="font-bold text-noir-100 text-sm">{currentSample.title}</div>
              <p className="text-noir-400 text-[11px] mt-1 max-w-md">{currentSample.desc}</p>
            </div>
          </div>

          {/* Analysis Results */}
          {analysisDone && (
            <div className="p-4 bg-noir-850 rounded-xl border border-noir-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-accent flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4" /> VISUAL OBJECT DETECTION REPORT
                </span>
                <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold rounded text-[10px]">
                  {(currentSample.confidence * 100).toFixed(0)}% CONFIDENCE
                </span>
              </div>
              <p className="text-noir-200 text-[11px] font-mono leading-relaxed">{currentSample.detected}</p>
              <div className="text-[10px] text-noir-400 pt-1 border-t border-noir-800">
                Uncertainty statement: Object model classification represents investigative estimation. Corroboration required.
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-noir-800">
            {!analysisDone ? (
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="px-5 py-2 bg-crimson hover:bg-crimson-bright text-white rounded font-bold flex items-center gap-2 transition-colors"
              >
                {analyzing ? (
                  <>
                    <span className="animate-spin">⚙</span> Scanning Pixels & Cues...
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
                <Check className="w-4 h-4" /> Pin to Investigation Corkboard & Graph
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
