import { useEffect, useState } from 'react';
import api from '../../api/client';
import OverviewStats from './sections/OverviewStats';
import HealthDashboard from './sections/HealthDashboard';
import DeveloperProfiles from './sections/DeveloperProfiles';
import QualityScorecard from './sections/QualityScorecard';
import JiraTasks from './sections/JiraTasks';
import SprintVelocity from './sections/SprintVelocity';
import CycleTime from './sections/CycleTime';
import Blockers from './sections/Blockers';
import WorkPatterns from './sections/WorkPatterns';
import Traceability from './sections/Traceability';
import CiCd from './sections/CiCd';
import BusFactorSection from './sections/BusFactor';
import MrHealth from './sections/MrHealth';
import Recommendations from './sections/Recommendations';

const NAV_ITEMS = [
  'Overview', 'Health', 'Profiles', 'Quality', 'Jira', 'Velocity',
  'Cycle Time', 'Blockers', 'Patterns', 'Traceability', 'CI/CD',
  'Bus Factor', 'MR Health', 'Recommendations',
];

export default function ReportPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('Overview');

  useEffect(() => {
    const endpoints = [
      'overview', 'health', 'developers', 'quality', 'jira', 'velocity',
      'cycle-time', 'blockers', 'patterns', 'traceability', 'cicd',
      'bus-factor', 'mr-health', 'recommendations',
    ];

    Promise.all(endpoints.map(e => api.get(`/reports/${e}`).then(r => r.data).catch(() => null)))
      .then(results => {
        const d: any = {};
        endpoints.forEach((e, i) => { d[e] = results[i]; });
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--dim)' }}>
        Loading report data...
      </div>
    );
  }

  const noData = !data.overview || data.overview.total_commits === 0;

  return (
    <div>
      {/* Report Nav */}
      <nav style={{
        position: 'sticky', top: 48, zIndex: 100,
        background: 'rgba(10,11,14,0.94)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border)', margin: '0 -32px', padding: '0 32px',
      }}>
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setActive(item)}
              style={{
                fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: active === item ? 'var(--amber)' : 'var(--muted)',
                padding: '13px 15px', whiteSpace: 'nowrap', textDecoration: 'none',
                borderBottom: `2px solid ${active === item ? 'var(--amber)' : 'transparent'}`,
              }}
            >
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Header */}
      <header style={{ padding: '60px 0 44px', borderBottom: '1px solid var(--border)', marginBottom: 52 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14 }}>
          Engineering Intelligence
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(48px, 7vw, 90px)',
          letterSpacing: '0.04em', color: 'var(--white)', lineHeight: 0.9, marginBottom: 18,
        }}>
          Team<br /><span style={{ color: 'var(--amber)' }}>Efficiency</span><br />Analysis
        </h1>
        <div style={{ display: 'flex', gap: 22, color: 'var(--dim)', fontSize: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
              boxShadow: '0 0 8px var(--green)', display: 'inline-block',
            }} />
            Live Data
          </span>
          <span>{data.overview?.engineer_count || 0} engineers</span>
        </div>
      </header>

      {noData ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--dim)' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: 'var(--white)', marginBottom: 12 }}>
            No Data Yet
          </div>
          <p>Connect your integrations, select developers, and trigger a sync to see your report.</p>
        </div>
      ) : (
        <>
          <OverviewStats data={data.overview} />
          <HealthDashboard data={data.health} />
          <DeveloperProfiles data={data.developers} />
          <QualityScorecard data={data.quality} />
          <JiraTasks data={data.jira} />
          <SprintVelocity data={data.velocity} />
          <CycleTime data={data['cycle-time']} />
          <Blockers data={data.blockers} />
          <WorkPatterns data={data.patterns} />
          <Traceability data={data.traceability} />
          <CiCd data={data.cicd} />
          <BusFactorSection data={data['bus-factor']} />
          <MrHealth data={data['mr-health']} />
          <Recommendations data={data.recommendations} />
        </>
      )}
    </div>
  );
}
