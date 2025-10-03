// Utility functions for normalizing stage values to Title Case

export function normalizeStage(stage: string | null | undefined): string | null {
  if (!stage) return null;
  
  const normalized = stage.toLowerCase().trim();
  
  switch (normalized) {
    case 'pre-seed':
    case 'preseed':
    case 'pre seed':
    case 'pre-seed (with functionable mvp)':
    case 'pre seed (with functionable mvp)':
      return 'Pre-Seed';
    case 'seed':
      return 'Seed';
    case 'series-a':
    case 'series a':
    case 'seriesa':
      return 'Series A';
    case 'series-b':
    case 'series b':
    case 'seriesb':
      return 'Series B';
    case 'series-c':
    case 'series c':
    case 'seriesc':
      return 'Series C';
    case 'growth':
      return 'Growth';
    case 'ipo':
      return 'IPO';
    default:
      // Fallback to capitalizing first letter for unknown stages
      return stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
  }
}

export function getStageColor(stage: string | null): string {
  switch (stage) {
    case 'Pre-Seed': 
      return 'bg-orange-100 text-orange-800';
    case 'Seed': 
      return 'bg-blue-100 text-blue-800';
    case 'Series A': 
      return 'bg-purple-100 text-purple-800';
    case 'Series B': 
      return 'bg-indigo-100 text-indigo-800';
    case 'Series C':
      return 'bg-pink-100 text-pink-800';
    case 'Growth':
      return 'bg-green-100 text-green-800';
    case 'IPO':
      return 'bg-yellow-100 text-yellow-800';
    default: 
      return 'bg-muted text-muted-foreground';
  }
}