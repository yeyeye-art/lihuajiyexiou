import React from 'react';
import { RestoredSection } from '../components/RestoredSection';
export const Guide: React.FC<{ initialQuery?: string }> = ({ initialQuery = '' }) => <RestoredSection page="guide" query={initialQuery} />;
