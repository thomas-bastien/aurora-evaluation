export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'description', 
    'industry',
    'stage',
    'location',
    'regions',
    'founded_year',
    'team_size',
    'funding_goal',
    'funding_raised',
    'website',
    'contact_email',
    'contact_phone',
    'founder_names',
    'status',
    'linkedin_url',
    'total_investment_received',
    'investment_currency',
    'business_model',
    'verticals',
    'other_vertical_description'
  ];

  const exampleRows = [
    [
      'TechFlow Solutions',
      'AI-powered workflow automation platform for small businesses',
      'Technology',
      'Seed',
      'San Francisco, CA',
      'North America',
      '2022',
      '8',
      '2000000',
      '500000',
      'https://techflow.com',
      'founder@techflow.com',
      '+1-555-0123',
      'Jane Smith;John Doe',
      'pending',
      'https://linkedin.com/company/techflow',
      '750000',
      'USD',
      'B2B',
      'Artificial Intelligence (AI/ML);Enterprise Software',
      ''
    ],
    [
      'EcoMart',
      'Sustainable e-commerce marketplace connecting eco-friendly brands',
      'E-commerce',
      'Pre-Seed',
      'Austin, TX',
      'North America',
      '2023',
      '4',
      '1000000',
      '150000',
      'https://ecomart.io',
      'hello@ecomart.io',
      '+1-555-0456',
      'Maria Garcia',
      'under_review',
      'https://linkedin.com/company/ecomart',
      '200000',
      'USD',
      'Marketplace',
      'RetailTech & E-commerce;Energy & Sustainability',
      ''
    ]
  ];

  const csvContent = [
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