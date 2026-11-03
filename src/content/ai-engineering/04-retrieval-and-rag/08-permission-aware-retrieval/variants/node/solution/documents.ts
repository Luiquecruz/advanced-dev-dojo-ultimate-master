export const DOCUMENTS = [
  {
    id: 'acme-handbook-leave',
    tenantId: 'acme',
    text: 'Acme employees get 25 days of paid leave a year. Leave requests are approved by your manager in the HR portal.',
    allowedGroups: ['all-staff'],
  },
  {
    id: 'acme-salary-bands',
    tenantId: 'acme',
    text: 'Acme salary bands for 2026: engineers from 70 000 to 140 000 euros, support agents from 38 000 to 55 000 euros.',
    allowedGroups: ['hr'],
  },
  {
    id: 'acme-incident-review',
    tenantId: 'acme',
    text: 'Incident review: the October outage of the ticket inbox was caused by an expired certificate on the mail gateway.',
    allowedGroups: ['engineering'],
  },
  {
    id: 'acme-performance-review-dana',
    tenantId: 'acme',
    text: 'Performance review for Dana: exceeds expectations, salary raise of 8 percent approved for January.',
    allowedGroups: [],
    allowedUsers: ['dana', 'maria'],
  },
  {
    id: 'globex-salary-bands',
    tenantId: 'globex',
    text: 'Globex salary bands for 2026: engineers from 80 000 to 150 000 dollars, sales from 50 000 to 90 000 dollars.',
    allowedGroups: ['hr'],
  },
  {
    id: 'globex-handbook-leave',
    tenantId: 'globex',
    text: 'Globex employees get 20 days of paid leave a year, plus public holidays in their country.',
    allowedGroups: ['all-staff'],
  },
];

export const PEOPLE = {
  maria: { userId: 'maria', tenantId: 'acme', groups: ['all-staff', 'hr'] },
  dana: { userId: 'dana', tenantId: 'acme', groups: ['all-staff', 'engineering'] },
  sam: { userId: 'sam', tenantId: 'acme', groups: ['all-staff'] },
  lee: { userId: 'lee', tenantId: 'globex', groups: ['all-staff', 'hr'] },
};
