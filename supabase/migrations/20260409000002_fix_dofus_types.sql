UPDATE dofus SET type = 'primordial'
WHERE slug IN (
  'dofus-emeraude', 'dofus-pourpre', 'dofus-turquoise', 'dofus-ivoire', 'dofus-ebene', 'dofus-ocre',
  'emeraude', 'pourpre', 'turquoise', 'ivoire', 'ebene', 'ocre'
);

UPDATE dofus SET type = 'secondaire'
WHERE slug NOT IN (
  'dofus-emeraude', 'dofus-pourpre', 'dofus-turquoise', 'dofus-ivoire', 'dofus-ebene', 'dofus-ocre',
  'emeraude', 'pourpre', 'turquoise', 'ivoire', 'ebene', 'ocre'
);
