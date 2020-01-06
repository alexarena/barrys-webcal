const express = require('express')
const fetch = require('node-fetch')

const formatISO = require('date-fns/formatISO')

const app = express()
const port = process.env.PORT || 3000

async function fetchSessions(token) {
  return fetch('https://betterbarrys.com/reservations/self', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(json => json.class_sessions)
}

const emojiFromClassType = type => {
  switch (type) {
    case 'lift':
      return '🏋️‍♀️ '
    case 'release':
      return '🧘‍♀️ '
    default:
      return ''
  }
}

const summaryFromSession = ({ class_type, spot_name, instructor_names }) =>
  `${emojiFromClassType(class_type)}${spot_name} w/${instructor_names.join(
    ' &'
  )}`

const toCalDate = dateStr => formatISO(new Date(dateStr), { format: 'basic' })

const toCalKeyValue = ([key, value]) => `${key}:${value}`

const sessionToVEvent = session => {
  const location = (session.location_name = 'Castro'
    ? '2280 Market St, San Francisco, CA 94114, United States'
    : session.location_name)

  const fields = [
    ['BEGIN', 'VEVENT'],
    ['UID', session.id],
    // DTSTAMP is the created at field, it *has* to be in UTC, but since we don't really care when it was created, we just add a Z to the zoned date
    ['DTSTAMP', toCalDate(session.booking_time) + 'Z'],
    ['DTSTART', toCalDate(session.start_datetime)],
    ['LOCATION', location],
    ['X-APPLE-STRUCTURED-LOCATION', location],
    ['DURATION', `PT${session.duration}M`],
    ['SUMMARY', summaryFromSession(session)],
    ['END', 'VEVENT']
  ]
  return fields.map(toCalKeyValue)
}

// borrowed from: https://stackoverflow.com/a/15030117
function flatten(arr) {
  return arr.reduce(function(flat, toFlatten) {
    return flat.concat(
      Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
    )
  }, [])
}

app.get('/:token', async (req, res) => {
  const { token } = req.params

  try {
    const sessions = await fetchSessions(token)

    const vEvents = sessions.map(sessionToVEvent)
    const headMeta = [
      ['BEGIN', 'VCALENDAR'],
      ['VERSION', '2.0'],
      ['PRODID', 'BarrysWebcal'],
      ['CALSCALE', 'GREGORIAN'],
      ['X-WR-CALNAME', `Barry's Classes`]
    ].map(toCalKeyValue)
    const tailMeta = [['END', 'VCALENDAR']].map(toCalKeyValue)
    const vCalendarArray = flatten([headMeta, vEvents, tailMeta])
    const vCalendarString = vCalendarArray.join('\n')

    res.set('Content-Type', 'text/calendar')
    return res.send(vCalendarString)
  } catch (e) {
    console.error(e)
    return res.status(500).send(e)
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
