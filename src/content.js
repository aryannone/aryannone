// =====================================================================
//  YOUR PORTFOLIO CONTENT
//  ---------------------------------------------------------------------
//  This is the ONLY file you need to edit to put your own info in.
//  Both the 3D campus and the classic page read from here.
//  Everything marked "TODO" is a placeholder.
// =====================================================================

export const profile = {
  name: 'Your Name', // TODO
  firstName: 'Your', // TODO
  // Rotating titles shown on the classic page hero
  roles: ['Student', 'Developer', 'Problem Solver', 'Lifelong Learner'], // TODO
  tagline: 'I build things for the web, learn something new every day, and love turning ideas into projects.', // TODO
  location: 'Your City, Country', // TODO
  status: 'Open to internships', // little green badge on the classic page ('' to hide)
  email: 'you@example.com', // TODO
  resumeUrl: '', // TODO: put resume.pdf in /public and write '/resume.pdf'
  photoUrl: '', // TODO: put photo.jpg in /public and write '/photo.jpg'
  socials: [
    { label: 'GitHub', url: 'https://github.com/' }, // TODO
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' }, // TODO
  ],
};

// ---------------------------------------------------------------------
//  YOUR 3D CHARACTER - tweak these so the student looks like you!
//  Colours are hex values (pick them at https://htmlcolorcodes.com).
// ---------------------------------------------------------------------
export const avatar = {
  skin: '#c68863',
  hair: '#1f1a17',
  hairStyle: 'short', // 'short' | 'spiky' | 'long' | 'bald'
  beard: false,
  glasses: false,
  shirt: '#3d7be0', // hoodie / t-shirt colour
  pants: '#2b3044',
  shoes: '#f2f2f2',
  backpack: '#e2574c', // set to null for no backpack
  height: 1.0, // 0.9 = shorter, 1.1 = taller
  build: 1.0, // 0.9 = slimmer, 1.15 = broader
};

// ---------------------------------------------------------------------
//  SECTIONS - each one is a building on campus
// ---------------------------------------------------------------------
export const about = {
  title: 'About Me',
  paragraphs: [
    "Hi! I'm a student who loves building things. This is placeholder text: tell visitors who you are, what you study, and what excites you.", // TODO
    'Mention what kind of opportunities you are looking for: internships, freelance projects, collaborations, or just making friends in tech.', // TODO
  ],
  facts: [
    { label: 'Studying', value: 'B.Tech / B.Sc (TODO)' },
    { label: 'Based in', value: 'Your City (TODO)' },
    { label: 'Open to', value: 'Internships & Freelance' },
  ],
};

// ---------------------------------------------------------------------
//  MY STORY - a scroll-driven photo storyline on the classic page.
//  Each chapter shows one photo. Put photos in /public (e.g.
//  /public/story/1.jpg) and set photo: '/story/1.jpg'. Leave photo
//  empty to show a placeholder frame.
// ---------------------------------------------------------------------
export const story = [
  { year: '2006', title: 'Where it all began', text: 'Placeholder: where you grew up and the first thing that made you curious.', photo: '' }, // TODO
  { year: '2015', title: 'The first computer', text: 'Placeholder: the moment you first got hooked on computers, games or building things.', photo: '' }, // TODO
  { year: '2020', title: 'Hello, World', text: 'Placeholder: your first line of code, first project or first late night debugging.', photo: '' }, // TODO
  { year: '2024', title: 'College life', text: 'Placeholder: joining college, clubs, friends and what you are studying now.', photo: '' }, // TODO
  { year: 'Next', title: "What's next", text: 'Placeholder: where you are heading: the internship, the product, the dream.', photo: '' }, // TODO
];

export const projects = [
  {
    title: 'Project One', // TODO
    description: 'A short description of what this project does and why it is cool. Mention the problem it solves.',
    tags: ['Python', 'Machine Learning'],
    image: '', // optional screenshot, e.g. '/project-one.png' in /public
    link: '',
    repo: '',
  },
  {
    title: 'Project Two', // TODO
    description: 'Another project. Keep it to two or three sentences, and highlight your role and the result.',
    tags: ['React', 'Node.js'],
    link: '',
    repo: '',
  },
  {
    title: 'Project Three', // TODO
    description: 'A third project. Hackathon builds, college assignments you are proud of, and side projects all count.',
    tags: ['Three.js', 'JavaScript'],
    link: '',
    repo: '',
  },
];

export const education = [
  {
    school: 'Your College Name', // TODO
    degree: 'Bachelor of Something',
    years: '2024 – 2028',
    detail: 'CGPA: X.X / 10 · Relevant courses: Data Structures, DBMS, ...',
  },
  {
    school: 'Your School Name', // TODO
    degree: 'Class XII',
    years: '2022 – 2024',
    detail: 'Percentage: XX%',
  },
];

export const certificates = [
  { name: 'Certificate Name', issuer: 'Issuer (Coursera / NPTEL / ...)', year: '2025', link: '' }, // TODO
  { name: 'Another Certificate', issuer: 'Issuer', year: '2025', link: '' },
];

export const skills = [
  { group: 'Languages', items: [{ name: 'Python', level: 80 }, { name: 'JavaScript', level: 70 }, { name: 'C++', level: 60 }] }, // TODO
  { group: 'Tools & Frameworks', items: [{ name: 'Git', level: 75 }, { name: 'React', level: 60 }, { name: 'SQL', level: 65 }] },
  { group: 'Soft Skills', items: [{ name: 'Teamwork', level: 90 }, { name: 'Communication', level: 85 }] },
];

export const achievements = [
  { title: 'Hackathon Winner', detail: 'Placeholder: 1st place at XYZ Hackathon 2025.', icon: '🏆' }, // TODO
  { title: 'Club Lead', detail: 'Placeholder: led the coding club and organised workshops.', icon: '⭐' },
  { title: 'Competitive Programming', detail: 'Placeholder: rating / ranks on platforms.', icon: '🥇' },
];

export const hobbies = {
  intro: 'When I am not coding, you can find me in the canteen with these:', // TODO
  items: [
    { icon: '🎮', name: 'Gaming' },
    { icon: '🎧', name: 'Music' },
    { icon: '🏏', name: 'Cricket' },
    { icon: '📸', name: 'Photography' },
  ],
  funFacts: ['Placeholder fun fact #1', 'Placeholder fun fact #2'], // TODO
};

export const contact = {
  intro: "Got an opportunity, an idea or just want to say hi? My inbox is always open.", // TODO
};
