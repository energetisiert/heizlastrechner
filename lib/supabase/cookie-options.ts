/**
 * Cookie-Domain fuer Single-Sign-On ueber alle *.energetisiert.de-Subdomains.
 *
 * WICHTIG: Domain nur setzen, wenn der Host tatsaechlich *.energetisiert.de
 * ist. Ein Browser verwirft jedes Set-Cookie mit einer Domain, die kein Suffix
 * des aktuellen Hosts ist, kommentarlos -- auf Vercel-Preview-Deployments
 * (*.vercel.app) und localhost wuerde die Session sonst nie gesetzt.
 *
 * Diese Datei MUSS in allen sechs Apps (Hub + fuenf Rechner) identisch
 * verwendet werden (kein Mono-Repo vorhanden -- diese Datei wird bewusst
 * unveraendert kopiert, wie der Rest des Security-Layers auch).
 */
export function ssoCookieOptions(host: string | null | undefined) {
  const istProdDomain = !!host && (host === 'energetisiert.de' || host.endsWith('.energetisiert.de'));
  if (!istProdDomain) return undefined;

  return {
    domain: '.energetisiert.de',
    sameSite: 'lax' as const,
    secure: true,
    httpOnly: true,
  };
}
