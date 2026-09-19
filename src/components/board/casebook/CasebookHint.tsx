'use client';
import React from 'react';

export const CasebookHint: React.FC<{ html: string }> = ({ html }) => (
  <div id="hint" dangerouslySetInnerHTML={{ __html: html }} />
);
