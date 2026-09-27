/**
 * Synthetic / Mock Social Media Intelligence Generator for CrimeLens
 * Generates structured mock OSINT profiles and evidence snippets for investigative demonstration.
 */

export interface MockSocialProfile {
  platform: string;
  handle: string;
  followers: string;
  status: 'Active' | 'Flagged' | 'Private' | 'Suspended';
  lastActive: string;
  location: string;
}

export interface MockPostSnippet {
  id: string;
  platform: string;
  timestamp: string;
  content: string;
  riskFlag: 'High' | 'Medium' | 'Low';
  associatedHandles: string[];
}

export interface MockSocialDossier {
  subjectName: string;
  queryTimestamp: string;
  profiles: MockSocialProfile[];
  posts: MockPostSnippet[];
  digitalFootprint: {
    ipSubnet: string;
    aliasHandles: string[];
    riskScore: number; // 0-100
  };
  markdownReport: string;
}

export function generateMockSocialDossier(personName: string): MockSocialDossier {
  const cleanName = personName.trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const formattedSlug = cleanName.toLowerCase().replace(/\s+/g, '.');

  const profiles: MockSocialProfile[] = [
    {
      platform: 'Twitter / X',
      handle: `@${slug}_official`,
      followers: '14.2K',
      status: 'Active',
      lastActive: '2 hours ago',
      location: 'Metropolitan Sector 4',
    },
    {
      platform: 'LinkedIn',
      handle: `in/${formattedSlug}`,
      followers: '850 contacts',
      status: 'Active',
      lastActive: '1 day ago',
      location: 'Global Trade Center',
    },
    {
      platform: 'Telegram Channel',
      handle: `@${slug}_intel_feed`,
      followers: '3.4K members',
      status: 'Flagged',
      lastActive: '30 mins ago',
      location: 'Encrypted Proxy',
    },
    {
      platform: 'Instagram',
      handle: `@${slug}.snaps`,
      followers: '5.8K',
      status: 'Private',
      lastActive: '3 days ago',
      location: 'Docklands Sector',
    },
  ];

  const posts: MockPostSnippet[] = [
    {
      id: 'post_01',
      platform: 'Telegram',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      content: `Shipment package #B-99 arrived at Pier 9. Inspection delayed till 22:00.`,
      riskFlag: 'High',
      associatedHandles: ['@vance_logistics', '@blackwood_ops'],
    },
    {
      id: 'post_02',
      platform: 'Twitter / X',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      content: `Late night meeting scheduled at Apex Maritime HQ. Essential updates coming soon.`,
      riskFlag: 'Medium',
      associatedHandles: ['@apex_maritime'],
    },
    {
      id: 'post_03',
      platform: 'LinkedIn',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      content: `Honored to announce our expansion into offshore container tracking & maritime logistics.`,
      riskFlag: 'Low',
      associatedHandles: ['@marlowe_corp'],
    },
  ];

  const riskScore = 78;

  const markdownReport = `### 🌐 Social Media Intelligence Dossier: **${cleanName}**
> **Source**: Synthetic OSINT Ingestion Engine  
> **Target Subject**: \`${cleanName}\`  
> **Risk Score**: **${riskScore}/100** (High Priority Activity Detected)

---

#### 📱 Detected Social Media Profiles

| Platform | Handle / Identifier | Status | Last Active | Location Tag |
| :--- | :--- | :--- | :--- | :--- |
${profiles.map(p => `| **${p.platform}** | \`${p.handle}\` | \`${p.status}\` | ${p.lastActive} | ${p.location} |`).join('\n')}

---

#### 🚩 High-Risk Posts & Intercepted Signals

${posts.map(p => `- **[${p.platform}]** (${p.riskFlag} Risk - *${new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})*  
  *"${p.content}"*  
  *Linked Handles*: ${p.associatedHandles.map(h => `\`${h}\``).join(', ')}`).join('\n\n')}

---

#### 🔍 Digital Footprint Summary
- **Primary Subnet Origin**: \`192.168.4.112\` (Proxied via East Coast node)
- **Known Alternate Handles**: \`${slug}_alt\`, \`shadow_${slug}\`
- **Recommended Action**: Select entity cards to link these handles into the active CrimeLens 3D Evidence Board.
`;

  return {
    subjectName: cleanName,
    queryTimestamp: new Date().toISOString(),
    profiles,
    posts,
    digitalFootprint: {
      ipSubnet: '192.168.4.112',
      aliasHandles: [`${slug}_alt`, `shadow_${slug}`],
      riskScore,
    },
    markdownReport,
  };
}
