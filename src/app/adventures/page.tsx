import { redirect } from 'next/navigation'

export default function AdventuresRedirect() {
  redirect('/listings?type=adventure')
}
