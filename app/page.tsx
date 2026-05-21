import { redirect } from 'next/navigation';

// La auth la hace proxy.ts: si no hay sesión válida redirige a /login.
// Si llegaste acá es porque ya estás logueado → al newsroom.
export default function Home() {
  redirect('/vu_newsroom.html');
}
