import { redirect } from 'next/navigation'

export default function CarRentalsRedirect() {
  redirect('/listings?type=car_rental')
}
