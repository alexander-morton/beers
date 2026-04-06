import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

function parseIsoDateUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function groupByDay(data) {
  const map = {}
  for (const entry of data) {
    const d = entry.isoDate
    if (!map[d]) map[d] = 0
    map[d] += entry.beers.length
  }
  // Fill in missing days with 0
  const dates = Object.keys(map).sort()
  if (!dates.length) return []
  const result = []
  let cur = new Date(dates[0])
  const end = new Date(dates[dates.length - 1])
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10)
    result.push({ date: key, beers: map[key] ?? 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}

function groupByWeek(data) {
  const map = {}
  for (const entry of data) {
    const d = parseIsoDateUTC(entry.isoDate)
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff)
    const monday = d
    const key = monday.toISOString().slice(0, 10)
    if (!map[key]) map[key] = 0
    map[key] += entry.beers.length
  }
  const weeks = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, beers]) => ({ date, beers }))
  // Drop the last week if it's incomplete (its Sunday hasn't passed yet)
  if (weeks.length) {
    const now = new Date()
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const lastMonday = parseIsoDateUTC(weeks[weeks.length - 1].date)
    const lastSunday = new Date(lastMonday)
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6)
    if (lastSunday >= today) weeks.pop()
  }
  return weeks
}

function computeCumulative(data) {
  const daily = groupByDay(data)
  let running = 0
  return daily.map(({ date, beers }) => {
    running += beers
    return { date, beers: running }
  })
}

function formatDate(dateStr, view) {
  const d = new Date(dateStr)
  if (view === 'week') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const CustomTooltip = ({ active, payload, label, view }) => {
  if (!active || !payload?.length) return null
  const d = new Date(label)
  const dateLabel = view === 'week'
    ? `w/c ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <div style={{
      background: '#1c0f02',
      border: '1px solid rgba(251,191,36,0.3)',
      borderRadius: '8px',
      padding: '8px 14px',
    }}>
      <div style={{ color: '#92400e', fontSize: '0.75rem' }}>{dateLabel}</div>
      <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1.1rem' }}>
        {payload[0].value} beers
      </div>
    </div>
  )
}

export default function VelocityChart({ data }) {
  const [view, setView] = useState('day')

  const chartData = useMemo(() => {
    if (view === 'day') return groupByDay(data)
    if (view === 'week') return groupByWeek(data)
    return computeCumulative(data)
  }, [data, view])

  const isCumulative = view === 'cumulative'
  const maxVal = Math.max(...chartData.map(d => d.beers), 1)
  const avgVal = isCumulative ? null : Math.round(chartData.reduce((s, d) => s + d.beers, 0) / (chartData.length || 1))

  const btnStyle = (active) => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    background: active ? '#78350f' : 'transparent',
    color: active ? '#fde68a' : '#92400e',
    transition: 'all 0.2s',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.75rem', color: '#78350f' }}>
          {isCumulative
            ? <>total: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{maxVal.toLocaleString()}</span></>
            : <>peak: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{maxVal}</span>
               {' '}· avg: <span style={{ color: '#b45309', fontWeight: 600 }}>{avgVal}</span></>
          }
        </div>
        <div style={{
          display: 'flex', gap: '4px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.15)',
          borderRadius: '10px', padding: '3px',
        }}>
          <button style={btnStyle(view === 'day')} onClick={() => setView('day')}>Daily</button>
          <button style={btnStyle(view === 'week')} onClick={() => setView('week')}>Weekly</button>
          <button style={btnStyle(view === 'cumulative')} onClick={() => setView('cumulative')}>Cumulative</button>
        </div>
      </div>

      <div style={{
        background: 'rgba(251,191,36,0.03)',
        border: '1px solid rgba(251,191,36,0.1)',
        borderRadius: '12px',
        padding: '16px 8px 8px',
      }}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="beerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,191,36,0.07)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatDate(d, view)}
              tick={{ fill: '#78350f', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={view === 'day' ? 6 : 0}
            />
            <YAxis
              tick={{ fill: '#78350f', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip view={view} />} />
            {!isCumulative && (
              <ReferenceLine
                y={avgVal}
                stroke="rgba(251,191,36,0.25)"
                strokeDasharray="4 4"
                label={{ value: 'avg', fill: '#78350f', fontSize: 9, position: 'right' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="beers"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#beerGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#fbbf24', stroke: '#1c0f02', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
