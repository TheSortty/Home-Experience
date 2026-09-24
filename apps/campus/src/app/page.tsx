import { redirect } from 'next/navigation';

// El campus no tiene home propia: la raíz es el punto de entrada de los links
// que apuntan a CAMPUS_URL a secas ("Ir al campus" del admin, el ?next= que arma
// el middleware cuando alguien abre campus.siendohome.com sin sesión, marcadores).
// Sin esto esos links daban 404. El middleware ya corre antes: sin sesión nunca
// se llega hasta acá, se manda al login.
export default function CampusRoot() {
  redirect('/dashboard');
}
