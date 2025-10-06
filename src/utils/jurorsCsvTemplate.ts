import * as XLSX from 'xlsx';

export function downloadJurorTemplate(): void {
  // Instructions sheet content (clean, no # markers)
  const instructions = [
    ['========================================'],
    ['JURORS UPLOAD TEMPLATE'],
    ['========================================'],
    [''],
    ['REQUIRED FIELDS (must have values):'],
    ['  - name (text)'],
    ['  - email (email address)'],
    [''],
    ['OPTIONAL FIELDS:'],
    ['  - job_title (text)'],
    ['  - company (text)'],
    ['  - fund_focus (text - investment focus area)'],
    ['  - linkedin_url (URL - LinkedIn profile)'],
    ['  - calendly_link (URL - Calendly scheduling link)'],
    ['  - evaluation_limit (number - max screening evaluations)'],
    ['  - meeting_limit (number - max pitching calls)'],
    ['  - thesis_keywords (array - semicolon-separated keywords)'],
    ['  - preferred_stages (array - semicolon-separated stages)'],
    ['  - target_verticals (array - semicolon-separated verticals)'],
    ['  - preferred_regions (array - semicolon-separated regions)'],
    [''],
    ['========================================'],
    ['ARRAY FIELDS (use semicolon ; to separate multiple values):'],
    ['  Example: "Seed;Series A;Series B"'],
    [''],
    ['========================================'],
    ['VALID FUNDING STAGES:'],
    ['  Pre-Seed, Seed, Series A, Series B, Series C+, Growth, IPO'],
    [''],
    ['VALID REGIONS:'],
    ['  Africa'],
    ['  Asia Pacific (APAC)'],
    ['  Europe'],
    ['  Latin America (LATAM)'],
    ['  Middle East & North Africa (MENA)'],
    ['  North America'],
    ['  Other'],
    [''],
    ['VALID VERTICALS (use exact spelling):'],
    ['  Artificial Intelligence (AI/ML)'],
    ['  Fintech'],
    ['  HealthTech & MedTech'],
    ['  Wellbeing, Longevity & Life Sciences'],
    ['  PharmTech'],
    ['  RetailTech & E-commerce'],
    ['  Enterprise Software'],
    ['  Cybersecurity'],
    ['  Productivity Tools'],
    ['  Transportation & Mobility'],
    ['  Energy & Sustainability'],
    ['  AgriTech & Food Tech'],
    ['  Media & Entertainment'],
    ['  AdTech & MarTech'],
    ['  Real Estate & PropTech'],
    ['  Education Technology (EdTech)'],
    ['  Logistics & Supply Chain'],
    ['  Construction Tech'],
    ['  Space Technology'],
    ['  Semiconductors & Hardware'],
    ['  Data Infrastructure & Analytics'],
    ['  Industrial Automation & Robotics'],
    ['  Aerospace & Defense'],
    ['  Gaming & Visual Assets'],
    ['  SportTech'],
    ['  Web3 / Blockchain / Crypto'],
    ['  TravelTech'],
    ['  No Tech, not a Venture Business'],
    ['  Others (Specify)'],
    [''],
    ['========================================'],
    ['TIPS:'],
    ['  - Leave optional fields empty (blank) if not applicable'],
    ['  - URLs must include http:// or https://'],
    ['  - Email addresses must be valid format'],
    ['  - Numbers should be whole numbers (no decimals for limits)']
  ];

  // Headers for data template
  const headers = [
    'name',
    'email',
    'job_title',
    'company',
    'fund_focus',
    'linkedin_url',
    'calendly_link',
    'thesis_keywords',
    'preferred_stages',
    'target_verticals',
    'preferred_regions',
    'evaluation_limit',
    'meeting_limit'
  ];

  // Example rows
  const exampleRows = [
    // Complete example with all preferences
    [
      'Sarah Johnson',
      'sarah.johnson@techventures.com',
      'Senior Partner',
      'TechVentures Capital',
      'Early-stage B2B SaaS',
      'https://linkedin.com/in/sarahjohnson',
      'https://calendly.com/sarahjohnson/30min',
      'API;Cloud Infrastructure;DevTools;Automation',
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
      'Digital Health Innovation',
      'https://linkedin.com/in/emilyrodriguez',
      '',
      'Medical Devices;Wearables;AI Health',
      'Pre-Seed;Seed',
      'HealthTech & MedTech;Wellbeing, Longevity & Life Sciences',
      'Latin America (LATAM);North America',
      '15',
      '8'
    ]
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add Instructions sheet
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Add Data Template sheet
  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  XLSX.utils.book_append_sheet(wb, wsData, 'Data Template');

  // Generate file and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'juror_template.xlsx');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}