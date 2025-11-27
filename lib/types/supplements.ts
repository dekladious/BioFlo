/**
 * Supplement Types
 * 
 * Types for supplement tracking and recommendations
 */

export type SupplementCategory = 
  | 'vitamin'
  | 'mineral'
  | 'amino_acid'
  | 'herb'
  | 'nootropic'
  | 'probiotic'
  | 'omega'
  | 'other';

export type TimingPreference = 'morning' | 'afternoon' | 'evening' | 'with_food' | 'empty_stomach' | 'before_bed';

export interface Supplement {
  id: string;
  name: string;
  category: SupplementCategory;
  dosage: string;
  unit: string;
  frequency: string;
  timings: TimingPreference[];
  notes?: string;
  brand?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SupplementLog {
  id: string;
  supplementId: string;
  takenAt: string;
  dosage?: string;
  notes?: string;
}

export interface DailySupplementStatus {
  supplement: Supplement;
  taken: boolean;
  takenAt?: string;
  scheduled: string[];
}

export function getCategoryLabel(cat: SupplementCategory): string {
  const labels: Record<SupplementCategory, string> = {
    vitamin: 'Vitamin',
    mineral: 'Mineral',
    amino_acid: 'Amino Acid',
    herb: 'Herbal',
    nootropic: 'Nootropic',
    probiotic: 'Probiotic',
    omega: 'Omega/Fish Oil',
    other: 'Other',
  };
  return labels[cat];
}

export function getCategoryIcon(cat: SupplementCategory): string {
  const icons: Record<SupplementCategory, string> = {
    vitamin: '💊',
    mineral: '�ite',
    amino_acid: '🧬',
    herb: '🌿',
    nootropic: '🧠',
    probiotic: '🦠',
    omega: '🐟',
    other: '💎',
  };
  return icons[cat];
}

export const COMMON_SUPPLEMENTS: Partial<Supplement>[] = [
  { name: 'Vitamin D3', category: 'vitamin', dosage: '5000', unit: 'IU', timings: ['morning', 'with_food'] },
  { name: 'Vitamin K2', category: 'vitamin', dosage: '100', unit: 'mcg', timings: ['morning', 'with_food'] },
  { name: 'Magnesium Glycinate', category: 'mineral', dosage: '400', unit: 'mg', timings: ['evening', 'before_bed'] },
  { name: 'Zinc', category: 'mineral', dosage: '30', unit: 'mg', timings: ['evening', 'with_food'] },
  { name: 'Omega-3 Fish Oil', category: 'omega', dosage: '2000', unit: 'mg', timings: ['morning', 'with_food'] },
  { name: 'Creatine', category: 'amino_acid', dosage: '5', unit: 'g', timings: ['morning'] },
  { name: 'Ashwagandha', category: 'herb', dosage: '600', unit: 'mg', timings: ['evening'] },
  { name: 'Lions Mane', category: 'nootropic', dosage: '1000', unit: 'mg', timings: ['morning'] },
  { name: 'Probiotic', category: 'probiotic', dosage: '50', unit: 'billion CFU', timings: ['morning', 'empty_stomach'] },
  { name: 'B-Complex', category: 'vitamin', dosage: '1', unit: 'capsule', timings: ['morning', 'with_food'] },
  { name: 'Vitamin C', category: 'vitamin', dosage: '1000', unit: 'mg', timings: ['morning'] },
  { name: 'CoQ10', category: 'other', dosage: '200', unit: 'mg', timings: ['morning', 'with_food'] },
];

