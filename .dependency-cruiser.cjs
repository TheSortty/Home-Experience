// Límites de arquitectura. Ver CONSTRAINTS.md → "Arquitectura".
// Se corre por app (cada una con su tsconfig para resolver los alias):
//   npm run check:arch
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'campus-no-importa-marketing',
      comment: 'Son dos Workers separados: lo compartido va en packages/services.',
      severity: 'error',
      from: { path: '^apps/campus/' },
      to: { path: '^apps/marketing/' },
    },
    {
      name: 'marketing-no-importa-campus',
      comment: 'Son dos Workers separados: lo compartido va en packages/services.',
      severity: 'error',
      from: { path: '^apps/marketing/' },
      to: { path: '^apps/campus/' },
    },
    {
      name: 'packages-no-importan-apps',
      comment: 'packages/* es la base compartida: no puede depender de una app.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'sin-ciclos',
      comment: 'Los imports circulares rompen el orden de carga en Workers.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(\\.next|\\.open-next|node_modules)/|cloudflare-env\\.d\\.ts$' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default', 'types'] },
  },
};
