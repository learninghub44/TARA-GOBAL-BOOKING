import { redirect } from 'next/navigation'

export default function ToursRedirect() {
  redirect('/listings?type=tour')
}
