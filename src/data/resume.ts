/** Career start — everything on the About page derives its "years of experience" from this. */
export const CAREER_START = 2012;

export const yearsOfExperience = () => new Date().getFullYear() - CAREER_START;

export type Role = {
  company: string;
  via?: string;
  title: string;
  from: number;
  /** Omitted while the role is current. */
  to?: number;
  stack: string[];
  summary: string;
  /** Intrinsic pixel dimensions, so the browser reserves the right box (no CLS). */
  logo?: { src: string; width: number; height: number; alt: string }[];
};

export const ROLES: Role[] = [
  {
    company: 'Crestron',
    via: 'Jabil',
    title: 'Senior Software Engineer',
    from: 2021,
    stack: ['C++', 'C', 'Java', 'Android'],
    summary: 'Implementation work for a Qualcomm-based control panel.',
    logo: [
      { src: '/images/resume/crestron.png', width: 146, height: 22, alt: 'Crestron' },
      { src: '/images/resume/jabil.png', width: 129, height: 22, alt: 'Jabil' },
    ],
  },
  {
    company: 'Octave Group',
    via: 'Promwad',
    title: 'Senior Software Engineer',
    from: 2021,
    to: 2021,
    stack: ['C++', 'C', 'Linux kernel'],
    summary: 'Bring-up of a p241-based AmLogic board and a firmware flashing tool.',
    logo: [{ src: '/images/resume/octave_group.png', width: 67, height: 22, alt: 'Octave Group' }],
  },
  {
    company: 'Liberty Global',
    via: 'Promwad',
    title: 'Senior Software Engineer',
    from: 2020,
    to: 2021,
    stack: ['C++', 'Dart', 'JavaScript', 'RDK', 'OpenGL', 'Python'],
    summary:
      'FPS optimisation on Broadcom-based set-top boxes, an FPS metering algorithm, and porting the Dart engine to a Broadcom device.',
    logo: [{ src: '/images/resume/liberty.png', width: 92, height: 22, alt: 'Liberty Global' }],
  },
  {
    company: 'Ericsson',
    via: 'MediaKind / Promwad',
    title: 'Software Engineer',
    from: 2018,
    to: 2020,
    stack: ['C++', 'TypeScript', 'JavaScript', 'Ruby'],
    summary: 'Supported a Netflix-based solution running on Broadcom devices.',
    logo: [{ src: '/images/resume/ericsson.png', width: 67, height: 22, alt: 'Ericsson' }],
  },
  {
    company: 'Freelance and pet projects',
    title: 'Independent developer',
    from: 2014,
    to: 2018,
    stack: ['C++', 'JavaScript', 'Neural networks'],
    summary:
      'Built rats-search, a P2P search engine with over 1000 users, and novastory, a custom C++ web server engine used for a tournament platform.',
  },
  {
    company: 'ScienceSoft',
    title: 'Software Engineer',
    from: 2012,
    to: 2014,
    stack: ['C', 'C++', 'Qt'],
    summary: 'Torrent downloader, video downloader, a custom browser and VoIP solutions.',
    logo: [{ src: '/images/resume/sciencesoft.png', width: 105, height: 22, alt: 'ScienceSoft' }],
  },
];

export const PROJECTS = [
  {
    name: 'rats-search',
    url: 'https://github.com/DEgITx/rats-search',
    description: 'BitTorrent P2P multi-platform search engine, crawler and web application.',
  },
  {
    name: 'novastory',
    url: 'https://github.com/draftup/novastory',
    description: 'Custom C++ web server engine, used as the base for a tournament platform.',
  },
];

export const PUBLICATIONS = [
  {
    title: 'How to port the Flutter SDK to set-top boxes for Android TV apps',
    outlet: 'ProAndroidDev',
    url: 'https://proandroiddev.com/how-to-port-flutter-sdk-to-set-top-boxes-for-android-tv-apps-running-and-development-eaf36981f903',
  },
  {
    title: 'How to develop GStreamer-based video conferencing apps for RDK & Linux set-top boxes',
    outlet: 'CNX Software',
    url: 'https://www.cnx-software.com/2020/10/22/how-to-develop-gstreamer-based-video-conferencing-apps-for-rdk-linux-set-top-boxes/',
  },
];

export const EDUCATION = {
  university: 'Belarusian State University (BSU)',
  faculty: 'Mechanics and Mathematics',
  degree: 'Mathematics and Computer Science',
  focus: 'Web technologies and computer modeling / Numerical methods and programming',
  thesis: 'Lagrange interpolation with Chebyshev systems of functions',
};
