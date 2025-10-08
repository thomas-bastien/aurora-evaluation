import * as XLSX from 'xlsx';

export function downloadCMTemplate(): void {
  const instructions = [
    ['========================================'],
    ['COMMUNITY MANAGERS UPLOAD TEMPLATE'],
    ['========================================'],
    [''],
    ['REQUIRED FIELDS (must have values):'],
    ['  - name (text)'],
    ['  - email (email address)'],
    [''],
    ['OPTIONAL FIELDS:'],
    ['  - job_title (text)'],
    ['  - organization (text)'],
    ['  - linkedin_url (URL - LinkedIn profile)'],
    ['  - can_manage_startups (boolean - true/false, default: true)'],
    ['  - can_manage_jurors (boolean - true/false, default: true)'],
    ['  - can_invite_cms (boolean - true/false, default: false)'],
    [''],
    ['========================================'],
    ['PERMISSIONS:'],
    ['  - can_manage_startups: Allow to add/edit/manage startup applications'],
    ['  - can_manage_jurors: Allow to add/edit/manage jury members'],
    ['  - can_invite_cms: Allow to send invitations to add more CMs'],
    [''],
    ['========================================'],
    ['TIPS:'],
    ['  - Leave optional fields empty (blank) if not applicable'],
    ['  - URLs must include http:// or https://'],
    ['  - Email addresses must be valid format'],
    ['  - Permission fields accept: true, false, 1, 0 (case insensitive)'],
    ['  - Default permissions: can_manage_startups=true, can_manage_jurors=true, can_invite_cms=false']
  ];

  const headers = [
    'name',
    'email',
    'job_title',
    'organization',
    'linkedin_url',
    'can_manage_startups',
    'can_manage_jurors',
    'can_invite_cms'
  ];

  const exampleRows = [
    [
      'Sarah Johnson',
      'sarah.johnson@aurora.com',
      'Community Manager',
      'Aurora Tech Awards',
      'https://linkedin.com/in/sarahjohnson',
      'true',
      'true',
      'true'
    ],
    [
      'Michael Chen',
      'mchen@aurora.com',
      'Program Coordinator',
      'Aurora Tech Awards',
      '',
      'true',
      'false',
      'false'
    ],
    [
      'Emily Rodriguez',
      'emily@aurora.com',
      '',
      '',
      '',
      '',
      '',
      ''
    ]
  ];

  const wb = XLSX.utils.book_new();

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  XLSX.utils.book_append_sheet(wb, wsData, 'Data Template');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'community_managers_template.xlsx');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
