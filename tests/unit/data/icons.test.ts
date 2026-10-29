import { describe, it, expect } from 'vitest';
import { getIcon, ICONS, type IconKey } from '@/data/icons';
import { Tag } from 'lucide-react';

describe('Icon Registry Engine', () => {
  it('resolves valid icon components for registered keys', () => {
    for (const key of Object.keys(ICONS) as IconKey[]) {
      const icon = getIcon(key);
      expect(icon).toBe(ICONS[key]);
      expect(typeof icon).toBe('object'); // React forwardRef component
    }
  });

  it('falls back to Tag icon when key is missing or undefined', () => {
    expect(getIcon(undefined)).toBe(Tag);
    expect(getIcon('')).toBe(Tag);
    expect(getIcon('non-existent-icon-xyz')).toBe(Tag);
  });
});

