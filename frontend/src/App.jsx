import { useState, useMemo } from 'react'
import beersData from './data/beers.json'
import WorldMap from './components/WorldMap'
import VelocityChart from './components/VelocityChart'

const LAST_UPDATED = '2026-03-30'
const MEDALS = ['🥇', '🥈', '🥉']
const GOAL = 1_000_000

function computeProjection(data) {
  const now = new Date("2026-03-30")
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - 30)

  const recent = data.filter(e => new Date(e.isoDate) >= cutoff)
  const recentBeers = recent.reduce((s, e) => s + e.beers.length, 0)
  const ratePerDay = recentBeers / 30

  const totalBeers = data.reduce((s, e) => s + e.beers.length, 0)
  const remaining = GOAL - totalBeers
  const daysLeft = remaining / ratePerDay

  const projected = new Date(now)
  projected.setDate(projected.getDate() + Math.round(daysLeft))

  return {
    ratePerDay: Math.round(ratePerDay),
    daysLeft: Math.round(daysLeft),
    projectedYear: projected.getFullYear(),
    projectedDate: projected.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

function filterByPeriod(data, period) {
  if (period === 'all') return data
  const now = new Date("2026-03-30")
  const cutoff = new Date(now)
  if (period === 'week') cutoff.setDate(now.getDate() - 7)
  if (period === 'month') cutoff.setMonth(now.getMonth() - 1)
  return data.filter(e => new Date(e.isoDate) >= cutoff)
}

function computeTotalBeers(data) {
  const map = {}
  for (const entry of data) {
    const p = entry.person
    if (!map[p]) map[p] = { person: p, count: 0, posts: 0 }
    map[p].count += entry.beers.length
    map[p].posts += 1
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}

function computeSinglePosts(data) {
  const map = {}
  for (const entry of data) {
    const p = entry.person
    if (!map[p]) map[p] = { person: p, count: 0 }
    if (entry.beers.length === 1) map[p].count += 1
  }
  return Object.values(map).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
}

function computePosts(data) {
  const map = {}
  for (const entry of data) {
    const p = entry.person
    if (!map[p]) map[p] = { person: p, count: 0 }
    map[p].count += 1
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'rgba(251,191,36,0.08)',
      border: '1px solid rgba(251,191,36,0.2)',
      borderRadius: '12px',
      padding: '12px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
        {value.toLocaleString()}
      </span>
      <span style={{ fontSize: '0.7rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  )
}

function LeaderboardRow({ rank, person, count, barMax, label, delay }) {
  const isTop3 = rank <= 3
  const pct = Math.max(4, (count / barMax) * 100)

  const borderColor =
    rank === 1 ? 'rgba(251,191,36,0.5)'
    : rank === 2 ? 'rgba(156,163,175,0.3)'
    : rank === 3 ? 'rgba(180,83,9,0.4)'
    : 'rgba(251,191,36,0.07)'

  const bgColor =
    rank === 1
      ? 'linear-gradient(135deg, rgba(120,53,15,0.6), rgba(146,64,14,0.35))'
      : isTop3
      ? 'rgba(30,18,4,0.8)'
      : 'rgba(18,10,1,0.6)'

  const barColor =
    rank === 1 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    : rank <= 3 ? 'rgba(251,191,36,0.55)'
    : 'rgba(251,191,36,0.25)'

  return (
    <div
      className="row-enter"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Rank */}
      <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
        {rank <= 3
          ? <span style={{ fontSize: '1.25rem' }}>{MEDALS[rank - 1]}</span>
          : <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#92400e' }}>#{rank}</span>
        }
      </div>

      {/* Name + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isTop3 ? '#fef3c7' : '#fde68a',
          }}>
            {person}
          </span>
          <span style={{
            marginLeft: '12px',
            fontWeight: 700,
            flexShrink: 0,
            color: rank === 1 ? '#fbbf24' : '#fcd34d',
          }}>
            {count}{' '}
            <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#92400e' }}>{label}</span>
          </span>
        </div>
        <div style={{ height: '3px', borderRadius: '9999px', background: 'rgba(251,191,36,0.1)', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: '9999px',
            background: barColor,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('leaderboard') // 'leaderboard' | 'map' | 'velocity'
  const [tab, setTab] = useState('total')
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => filterByPeriod(beersData, period), [period])
  const totalRows = useMemo(() => computeTotalBeers(filtered), [filtered])
  const postRows = useMemo(() => computePosts(filtered), [filtered])

  const baseRows = (tab === 'total' ? totalRows : postRows).map((r, i) => ({ ...r, rank: i + 1 }))
  const rows = search.trim()
    ? baseRows.filter(r => r.person.toLowerCase().includes(search.trim().toLowerCase()))
    : baseRows
  const barMax = baseRows[0]?.count ?? 1

  const lastBeerNum = useMemo(() => Math.max(...beersData.flatMap(e => e.beers)), [])
  const totalPeople = useMemo(() => new Set(beersData.map(e => e.person)).size, [])
  const projection = useMemo(() => computeProjection(beersData), [])

  const periodBeers = useMemo(() => filtered.reduce((s, e) => s + e.beers.length, 0), [filtered])
  const periodPeople = useMemo(() => new Set(filtered.map(e => e.person)).size, [filtered])

  const btnBase = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f0a03 0%, #1a0d00 50%, #0f0a03 100%)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '40px 16px 24px' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 3rem)',
          fontWeight: 800,
          color: '#fbbf24',
          margin: '0 0 6px',
          letterSpacing: '-0.03em',
        }}>
          1 Million Beers
        </h1>
        <p style={{ color: '#92400e', fontSize: '0.85rem', marginBottom: '4px' }}>
          by{' '}
          <a
            href="https://www.linkedin.com/in/alex-morton-uk/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#b45309', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            mort
          </a>
          {' '}· {totalPeople} contributors · updated {LAST_UPDATED}
        </p>
      </div>

      {/* Top nav */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.15)',
          borderRadius: '14px',
          padding: '4px',
          gap: '4px',
        }}>
          {[
            { key: 'leaderboard', label: '🏆 Leaderboard' },
            { key: 'map', label: '🌍 World Map' },
            { key: 'velocity', label: '📈 Velocity' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                background: page === key ? '#f59e0b' : 'transparent',
                color: page === key ? '#1c1917' : '#b45309',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px 64px' }}>
        {/* Stat cards — always visible */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <StatCard label="Beer Count" value={lastBeerNum} />
          <StatCard label="Contributors" value={totalPeople} />
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#78350f', marginBottom: '28px' }}>
          true total is 5,037 due to skipped numbers &amp; duplicate claims
        </p>

        {/* ── LEADERBOARD PAGE ── */}
        {page === 'leaderboard' && (
          <>
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '12px',
                padding: '4px',
                gap: '4px',
              }}>
                {[
                  { key: 'total', label: '🍺 Total Beers' },
                  { key: 'posts', label: '📬 Beer Posts' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      ...btnBase,
                      background: tab === key ? '#f59e0b' : 'transparent',
                      color: tab === key ? '#1c1917' : '#b45309',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{
                display: 'flex',
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '12px',
                padding: '4px',
                gap: '4px',
              }}>
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'month', label: 'This Month' },
                  { key: 'week', label: 'This Week' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriod(key)}
                    style={{
                      ...btnBase,
                      background: period === key ? '#78350f' : 'transparent',
                      color: period === key ? '#fde68a' : '#92400e',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: '12px',
                padding: '9px 14px',
                color: '#fde68a',
                fontSize: '0.875rem',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.15)'}
            />

            {period !== 'all' && (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#92400e', marginBottom: '12px' }}>
                {period === 'week' ? 'Last 7 days' : 'Last 30 days'}:{' '}
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{periodBeers} beers</span>
                {' '}from{' '}
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{periodPeople} people</span>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#78350f', marginBottom: '16px' }}>
              {tab === 'total'
                ? 'Ranked by total beers claimed across all posts'
                : 'Ranked by number of messages posted claiming any amount of beers'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rows.length === 0
                ? <div style={{ textAlign: 'center', color: '#78350f', padding: '48px' }}>{search.trim() ? 'No matches found' : 'No data for this period'}</div>
                : rows.map((row) => (
                  <LeaderboardRow
                    key={`${tab}-${period}-${row.person}`}
                    rank={row.rank}
                    person={row.person}
                    count={row.count}
                    barMax={barMax}
                    label={tab === 'total' ? 'beers' : 'posts'}
                    delay={Math.min(row.rank * 18, 350)}
                  />
                ))
              }
            </div>
          </>
        )}

        {/* ── WORLD MAP PAGE ── */}
        {page === 'map' && (
          <>
            <h2 style={{ textAlign: 'center', color: '#b45309', fontSize: '0.8rem', fontWeight: 500, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Beers by location
            </h2>
            <WorldMap data={beersData} />
          </>
        )}

        {/* ── VELOCITY PAGE ── */}
        {page === 'velocity' && (
          <>
            <h2 style={{ textAlign: 'center', color: '#b45309', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Drinking momentum over time
            </h2>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.65rem', color: '#4a2008', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
                at current pace · {projection.ratePerDay} beers/day
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#92400e', letterSpacing: '-0.01em' }}>
                1,000,000 by{' '}
                <span style={{ color: '#b45309' }}>{projection.projectedDate}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#3d1a03', marginTop: '2px' }}>
                {projection.daysLeft.toLocaleString()} days · {projection.projectedYear - 2026} years from now
              </div>
            </div>
            <VelocityChart data={beersData} />
          </>
        )}

      </div>
    </div>
  )
}
