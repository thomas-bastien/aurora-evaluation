export function generateJurorsCSVTemplate(): string {
  // Documentation rows
  const docRows = [
    '# REQUIRED FIELDS: name, email',
    '# OPTIONAL FIELDS: job_title, company, linkedin_url, calendly_link, preferred_stages, target_verticals, preferred_regions, evaluation_limit, meeting_limit',
    '# ARRAY FIELDS (semicolon-separated): preferred_stages, target_verticals, preferred_regions',
    '# VALID STAGES: Pre-Seed, Seed, Series A, Series B, Series C+, Growth, IPO',
    '# VALID REGIONS: Africa, Asia Pacific (APAC), Europe, Latin America (LATAM), Middle East & North Africa (MENA), North America',
    '# VALID VERTICALS: See startup template for full list (e.g., "Artificial Intelligence (AI/ML);Fintech;HealthTech & MedTech")',
    '# evaluation_limit: Number of startups this juror should evaluate (leave empty for no limit)',
    '# meeting_limit: Number of pitching calls this juror should conduct (leave empty for no limit)',
    ''
  ];

  const headers = [
    'name',
    'email',
    'job_title',
    'company',
    'linkedin_url',
    'calendly_link',
    'preferred_stages',
    'target_verticals',
    'preferred_regions',
    'evaluation_limit',
    'meeting_limit'
  ];

  const exampleRows = [
    // Complete example with all preferences
    [
      'Sarah Johnson',
      'sarah.johnson@techventures.com',
      'Senior Partner',
      'TechVentures Capital',
      'https://linkedin.com/in/sarahjohnson',
      'https://calendly.com/sarahjohnson/30min',
      'Seed;Series A',
      'Artificial Intelligence (AI/ML);Enterprise Software;Fintech',
      'North America;Europe',
      '10',
      '5'
    ],
    // Minimal example with only required fields
    [
      'Michael Chen',
      'mchen@innovatefund.io',
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
    // Mixed example with partial preferences
    [
      'Emily Rodriguez',
      'emily@growthpartners.com',
      'Principal',
      'Growth Partners LLC',
      'https://linkedin.com/in/emilyrodriguez',
      '',
      'Pre-Seed;Seed',
      'HealthTech & MedTech;RetailTech & E-commerce',
      'Latin America (LATAM);North America',
      '15',
      '8'
    ]
  ];

  const csvContent = [
    ...docRows,
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadJurorsCSVTemplate(): void {
  const csvContent = generateJurorsCSVTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'jurors_template.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}