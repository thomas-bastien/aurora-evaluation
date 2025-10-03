export function generateCSVTemplate(): string {
  // Documentation rows
  const docRows = [
    '# REQUIRED FIELDS: name, contact_email, description',
    '# OPTIONAL FIELDS: All other fields are optional',
    '# ARRAY FIELDS (semicolon-separated): founder_names, regions, verticals',
    '# VALID STAGES: Pre-Seed, Seed, Series A, Series B, Series C+, Growth, IPO',
    '# VALID STATUS: pending, under_review, approved, rejected, waitlisted',
    '# VALID CURRENCIES: GBP, USD, EUR',
    '# VALID BUSINESS MODELS: B2B, B2C, B2B2C, Marketplace, SaaS, Hardware, Services, Platform',
    '# VALID REGIONS: Africa, Asia Pacific (APAC), Europe, Latin America (LATAM), Middle East & North Africa (MENA), North America',
    ''
  ];

  const headers = [
    'name',
    'description',
    'contact_email',
    'industry',
    'stage',
    'location',
    'country',
    'regions',
    'founded_year',
    'team_size',
    'funding_goal',
    'funding_raised',
    'business_model',
    'verticals',
    'other_vertical_description',
    'website',
    'pitch_deck_url',
    'demo_url',
    'linkedin_url',
    'founder_names',
    'status'
  ];

  const exampleRows = [
    // Complete example with all fields
    [
      'TechFlow Solutions',
      'AI-powered workflow automation platform for small businesses',
      'founder@techflow.com',
      'Technology',
      'Seed',
      'San Francisco, CA',
      'United States',
      'North America',
      '2022',
      '8',
      '2000000',
      '500000',
      'B2B SaaS',
      'Artificial Intelligence (AI/ML);Enterprise Software',
      '',
      'https://techflow.com',
      'https://drive.google.com/file/d/example-deck',
      'https://demo.techflow.com',
      'https://linkedin.com/company/techflow',
      'Jane Smith;John Doe',
      'pending'
    ],
    // Minimal example with only required fields
    [
      'EcoMart',
      'Sustainable e-commerce marketplace connecting eco-friendly brands',
      'hello@ecomart.io',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ],
    // Mixed example with some optional fields
    [
      'HealthTrack AI',
      'Personalized health monitoring using wearable sensor data and machine learning',
      'contact@healthtrack.ai',
      'Healthcare',
      'Pre-Seed',
      'London, UK',
      'United Kingdom',
      'Europe',
      '2023',
      '5',
      '1500000',
      '250000',
      'B2C',
      'HealthTech & MedTech;Artificial Intelligence (AI/ML)',
      '',
      'https://healthtrack.ai',
      '',
      '',
      'https://linkedin.com/company/healthtrack-ai',
      'Dr. Sarah Chen;Michael O\'Connor',
      'under_review'
    ]
  ];

  const csvContent = [
    ...docRows,
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCSVTemplate(): void {
  const csvContent = generateCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'startup_template.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}