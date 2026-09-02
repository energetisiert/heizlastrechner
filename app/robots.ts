import type { MetadataRoute } from 'next';

/**
 * Die Middleware verlangt inzwischen ueberall eine Anmeldung + Freischaltung
 * -- eine Suchmaschine, die '/' crawlt, wuerde nur auf die Hub-Login-Seite
 * umgeleitet. Deshalb nicht mehr zur Indexierung einladen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
