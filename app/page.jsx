function buildMailto(c) {
  const sales = user.amEmail || 'info@youragency.com';
  // Prefer denormalized recruiter email on the candidate row; fall back to lookup map
  const recruiterEmail = (c?.created_by_email || recruiterEmailById?.[c?.created_by] || '').trim();

  const to = (sales || recruiterEmail || 'info@youragency.com').trim();
  const cc =
    recruiterEmail &&
    (!sales || sales.toLowerCase() !== recruiterEmail.toLowerCase())
      ? recruiterEmail
      : '';

  const subj = `Talent Connector Candidate — ${c?.name || ''}`;
  const NL = '\n'; // single-line literal newline
  const body = [
    'Hello,',
    '',
    "I'm interested in this candidate:",
    `• Name: ${c?.name || ''}`,
    `• Titles: ${c?.titles_csv || ''}`,
    `• Type of law: ${c?.law_csv || ''}`,
    `• Location: ${[c?.city, c?.state].filter(Boolean).join(', ')}`,
    `• Years: ${c?.years ?? ''}`,
    c?.contract && c?.hourly ? `• Contract: $${Math.round(c.hourly * 1.66)}/hr` : '',
    c?.salary ? `• Salary: $${c.salary}` : '',
    '',
    `My email: ${user.email || ''}`,
    '',
    'Sent from Talent Connector',
  ].filter(Boolean).join(NL);

  const params = [];
  if (cc) params.push('cc=' + encodeURIComponent(cc));           // put cc first for picky clients
  params.push('subject=' + encodeURIComponent(subj));
  params.push('body=' + encodeURIComponent(body));

  // IMPORTANT: do not encode the 'to' address
  return `mailto:${to}?${params.join('&')}`;
}
