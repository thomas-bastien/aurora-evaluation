export function generateJurorsCSVTemplate(): string {
  const headers = [
    'name',
    'email', 
    'job_title',
    'company'
  ];

  const exampleRows = [
    [
      'Sarah Johnson',
      'sarah.johnson@techventures.com',
      'Senior Partner',
      'TechVentures Capital'
    ],
    [
      'Michael Chen',
      'mchen@innovatefund.io',
      'Investment Director',
      'Innovate Fund'
    ],
    [
      'Emily Rodriguez',
      'emily@growthpartners.com',
      'Principal',
      'Growth Partners LLC'
    ]
  ];

  const csvContent = [
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