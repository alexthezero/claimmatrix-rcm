import type { RuleSource } from '../domain/types';

export const formatSource: RuleSource = {
  id: 'cm-format-v1',
  title: 'ClaimMatrix structural validation',
  authority: 'ClaimMatrix',
  category: 'format',
  version: '0.1.0',
};

export const demoNcciSource: RuleSource = {
  id: 'demo-ncci-pair',
  title: 'Synthetic NCCI-style pair edit',
  authority: 'DEMO ONLY — not CMS data',
  category: 'demo',
  version: 'demo-1',
};

export const demoMueSource: RuleSource = {
  id: 'demo-mue',
  title: 'Synthetic MUE-style unit edit',
  authority: 'DEMO ONLY — not CMS data',
  category: 'demo',
  version: 'demo-1',
};

export const demoAddonSource: RuleSource = {
  id: 'demo-addon',
  title: 'Synthetic add-on code edit',
  authority: 'DEMO ONLY — not CMS data',
  category: 'demo',
  version: 'demo-1',
};

export const demoRules = {
  incompatiblePairs: [
    {
      columnOne: 'TEST1',
      columnTwo: 'TEST2',
      modifierAllowed: true,
      source: demoNcciSource,
    },
  ],
  unitLimits: [
    {
      code: 'TEST3',
      maxUnits: 2,
      source: demoMueSource,
    },
  ],
  addOnRequirements: [
    {
      addOnCode: 'TEST4',
      primaryCodes: ['TEST5'],
      source: demoAddonSource,
    },
  ],
};
