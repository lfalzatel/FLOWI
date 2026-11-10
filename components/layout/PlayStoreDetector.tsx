'use client';
import { useEffect } from 'react';
import { detectPlayStoreApp } from '@/lib/appStore';

export function PlayStoreDetector() {
  useEffect(() => { detectPlayStoreApp(); }, []);
  return null;
}
