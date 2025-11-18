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
  status: 'active' | 'development' | 'planned';
}

export interface AIResponse {
  message: string;
  mood: string;
}