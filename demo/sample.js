// Fictional sample content for the hosted demo. "Jordan Rivera" and "Northwind
// Health" are made up. The tailored result only reuses facts that appear in the
// sample master resume, mirroring the "never invent experience" rule of the app.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CursusDemoSample = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const masterResume = `JORDAN RIVERA
jordan.rivera@example.com | (555) 010-0142 | State University

SUMMARY
Computer science student who likes fixing things, explaining them clearly, and automating the boring parts. Experience across help desk, campus IT, and retail.

SKILLS
Python, JavaScript, SQL, Bash, Git, Figma, Excel
Windows 10/11, macOS, Linux (Ubuntu), Active Directory, Microsoft 365, Wi-Fi troubleshooting
Customer service, public speaking

EXPERIENCE
Barista | Maple Street Coffee | Springfield, VA | May 2023 - Aug 2024
- Served 150+ customers per shift in a fast-paced environment
- Trained 4 new hires on the register and opening procedures

IT Help Desk Assistant | State University IT Services | Springfield, VA | Aug 2024 - Present
- Resolve 25+ tickets a week for students and staff covering accounts, Wi-Fi, printers, and software installs
- Reset passwords and unlock accounts in Active Directory after verifying identity
- Wrote 12 knowledge-base articles that cut repeat tickets for common problems
- Set up and imaged 40 lab computers before the fall semester

Treasurer and Workshop Lead | Campus Tech Club | Springfield, VA | Sep 2023 - Present
- Ran monthly Linux and networking workshops for 20+ members
- Built a Python script that automated attendance tracking

EDUCATION
B.S. Computer Science | State University | Springfield, VA | Expected May 2026
Coursework: Networking, Operating Systems, Databases, Intro to Cybersecurity

CERTIFICATES
CompTIA A+ (2025)
`;

  const jobDescription = `IT Support Specialist
Northwind Health (sample job posting)

About the role
You will be the first point of contact for our staff when something is not working. We want someone who can troubleshoot calmly, explain fixes in plain language, and leave things better documented than they found them.

Responsibilities
- Respond to and resolve support tickets for hardware, software, and network issues
- Create and manage user accounts in Active Directory and Microsoft 365
- Image, deploy, and maintain Windows and macOS workstations
- Write and update knowledge-base articles
- Communicate clearly with non-technical users

Qualifications
- CompTIA A+ or equivalent experience
- Hands-on experience with Windows, macOS, and Active Directory
- Strong written and verbal communication

Nice to have
- Scripting experience (Python, PowerShell, or Bash)
- Familiarity with Linux
`;

  const tailoredResume = {
    name: 'Jordan Rivera',
    email: 'jordan.rivera@example.com',
    phone: '(555) 010-0142',
    university: 'State University',
    summary:
      'Computer science student with hands-on help desk experience, resolving 25+ tickets a week across accounts, Wi-Fi, printers, and software installs. CompTIA A+ certified, comfortable with Active Directory, Microsoft 365, Windows, macOS, and Linux, and in the habit of documenting fixes so they stick.',
    technicalSkills: {
      categories: [
        {
          name: 'Support and administration',
          items: ['Active Directory', 'Microsoft 365', 'Windows 10/11', 'macOS', 'Wi-Fi troubleshooting']
        },
        {
          name: 'Scripting and tools',
          items: ['Python', 'Bash', 'Linux (Ubuntu)', 'JavaScript', 'SQL', 'Git']
        }
      ]
    },
    softSkills: ['Customer service', 'Clear communication', 'Documentation', 'Training and mentoring'],
    experience: [
      {
        title: 'IT Help Desk Assistant',
        company: 'State University IT Services',
        location: 'Springfield, VA',
        startDate: 'Aug 2024',
        endDate: 'Present',
        bullets: [
          'Resolve 25+ tickets a week for students and staff covering accounts, Wi-Fi, printers, and software installs',
          'Reset passwords and unlock accounts in Active Directory after verifying identity',
          'Wrote 12 knowledge-base articles that cut repeat tickets for common problems',
          'Set up and imaged 40 lab computers before the fall semester'
        ]
      },
      {
        title: 'Treasurer and Workshop Lead',
        company: 'Campus Tech Club',
        location: 'Springfield, VA',
        startDate: 'Sep 2023',
        endDate: 'Present',
        bullets: [
          'Ran monthly Linux and networking workshops for 20+ members',
          'Built a Python script that automated attendance tracking'
        ]
      },
      {
        title: 'Barista',
        company: 'Maple Street Coffee',
        location: 'Springfield, VA',
        startDate: 'May 2023',
        endDate: 'Aug 2024',
        bullets: [
          'Served 150+ customers per shift in a fast-paced environment',
          'Trained 4 new hires on the register and opening procedures'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        school: 'State University',
        location: 'Springfield, VA',
        date: 'Expected May 2026',
        details: ['Coursework: Networking, Operating Systems, Databases, Intro to Cybersecurity']
      }
    ],
    certifications: ['CompTIA A+ (2025)']
  };

  return { masterResume, jobDescription, tailoredResume };
});
