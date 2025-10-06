export interface AIGuidanceRoute {
  route: string;
  label: string;
  icon: string;
  description: string;
  requiresRound?: boolean;
}

export const AI_GUIDANCE_ROUTES = {
  vc: [
    { 
      route: '/dashboard', 
      label: 'Go to Dashboard', 
      icon: 'BarChart3',
      description: 'Overview of evaluations and progress'
    },
    { 
      route: '/evaluate', 
      label: 'Start Evaluations', 
      icon: 'PlayCircle',
      description: 'Begin evaluating assigned startups'
    },
    { 
      route: '/evaluate', 
      label: 'Continue Evaluations', 
      icon: 'CheckCircle2',
      description: 'Resume pending evaluations'
    },
    { 
      route: '/profile', 
      label: 'Update Profile', 
      icon: 'Users',
      description: 'Edit preferences and Calendly link'
    }
  ],
  admin: [
    { 
      route: '/dashboard', 
      label: 'Dashboard Overview', 
      icon: 'BarChart3',
      description: 'High-level cohort metrics'
    },
    { 
      route: '/selection?tab=startup-selection', 
      label: 'Review Startups', 
      icon: 'Users',
      description: 'Manage startup applications',
      requiresRound: true
    },
    { 
      route: '/selection?tab=jury-progress', 
      label: 'Monitor Jury Progress', 
      icon: 'CheckCircle2',
      description: 'Track evaluation completion',
      requiresRound: true
    },
    { 
      route: '/selection?tab=matchmaking', 
      label: 'Matchmaking', 
      icon: 'Users',
      description: 'Assign jurors to startups',
      requiresRound: true
    },
    { 
      route: '/selection?tab=communications', 
      label: 'Communications', 
      icon: 'Send',
      description: 'Manage email communications',
      requiresRound: true
    },
    { 
      route: '/email-management', 
      label: 'Email Templates', 
      icon: 'Mail',
      description: 'Manage email templates'
    }
  ]
};

export const FALLBACK_ROUTES = {
  vc: '/dashboard',
  admin: '/dashboard'
};

export function buildRouteWithRound(
  route: AIGuidanceRoute, 
  roundName?: string
): string {
  if (!route.requiresRound || !roundName) {
    return route.route;
  }
  
  const separator = route.route.includes('?') ? '&' : '?';
  return `${route.route}${separator}round=${roundName}`;
}
