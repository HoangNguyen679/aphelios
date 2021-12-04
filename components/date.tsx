import { parseISO, format } from 'date-fns'

type DateStringProps = {
  dateString: string
}

export const Date = ({ dateString }: DateStringProps) => {
  const date = parseISO(dateString)
  return <time dateTime={dateString}>{format(date, 'LLLL d, yyyy')}</time>
}