type DateStringProps = {
  dateString: string
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
})

export const Date = ({ dateString }: DateStringProps) => {
  const date = new globalThis.Date(`${dateString}T00:00:00Z`)
  return <time dateTime={dateString}>{dateFormatter.format(date)}</time>
}
