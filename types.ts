import { LucideIcon } from 'lucide-react';

export interface ServiceLink {
  id: string;
  name: string;
  description: string;
  url: string;
  iconName: string; // We will map string names to actual icons
  color: string;
  status?: 'active' | 'planned';
}

export interface InternalTool {
  id: string;
  name: string;
  description: string;
  path?: string;
  externalUrl?: string;
  iconName: string;
  color: string;
  category: 'workbench' | 'web-dev';
  status: 'active' | 'development' | 'planned' | 'beta';
}

export interface AIResponse {
  message: string;
  mood: string;
}

export interface Tap {
  id: number;
  name: string; // Custom or from Batch
  style: string;
  abv: number;
  ibu: number;
  srm: number;
  description: string;
  brewDate?: string;
  kegDate?: string;
  batchNo?: string; // Link to Brewfather
  image?: string; // URL or generated placeholder
  active: boolean;
}

export interface BrewfatherBatch {
  _id: string;
  batchNo: number;
  name: string;
  status: string;
  brewDate: number;
  bottlingDate?: number;
  measuredAbv?: number;
  estimatedAbv?: number; // Batch estimated ABV
  ibu?: number;          // Batch calculated IBU
  color?: number;        // Batch calculated Color
  recipe: {
    name: string;
    style: {
      name: string;
    };
    abv: number;
    ibu: number;
    color: number; // SRM
  };
}