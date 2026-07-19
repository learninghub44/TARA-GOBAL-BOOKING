import { redirect } from 'next/navigation'

export default function TravelServicesRedirect() {
  redirect('/listings?type=travel_service')
}
