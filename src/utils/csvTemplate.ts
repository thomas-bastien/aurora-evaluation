export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'description', 
    'industry',
    'stage',
    'location',
    'founded_year',
    'team_size',
    'funding_goal',
    'funding_raised',
    'website',
    'contact_email',
    'contact_phone',
    'founder_names',
    'status'
  ];

  const exampleRows = [
    [
      'TechFlow Solutions',
      'AI-powered workflow automation platform for small businesses',
      'Technology',
      'seed',
      'San Francisco, CA',
      '2022',
      '8',
      '2000000',
      '500000',
      'https://techflow.com',
      'founder@techflow.com',
      '+1-555-0123',
      'Jane Smith;John Doe',
      'pending'
    ],
    [
      'EcoMart',
      'Sustainable e-commerce marketplace connecting eco-friendly brands',
      'E-commerce',
      'pre-seed',
      'Austin, TX',
      '2023',
      '4',
      '1000000',
      '150000',
      'https://ecomart.io',
      'hello@ecomart.io',
      '+1-555-0456',
      'Maria Garcia',
      'under-review'
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