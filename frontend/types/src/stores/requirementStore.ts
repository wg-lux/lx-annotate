import { defineStore } from 'pinia';

// Domain-Typen (erweiterbar)
export type RequirementType =
  | 'patient'
  | 'patient_finding'
  | 'patient_examination'
  | 'patient_lab_value'
  | 'patient_disease';

export type RequirementOperator =
  | 'models_match_all'
  | 'models_match_any'
  | 'age_gte'
  | 'age_lte'
  | 'numeric_value_within_normal_range'
  | 'numeric_value_gte'
  | 'numeric_value_lte'
  | 'models_match_any_in_timeframe'
  | (string & {}); // Erweiterungen erlauben

export type RequirementSetType =
  | 'all'
  | 'any'
  | 'none'
  | 'exactly_1'
  | 'at_least_1'
  | 'at_most_1';

// Requirement gemäß Guide (Felder optional gehalten, um YAML/Backend-Flexibilität zu erlauben)
export interface Requirement {
  id?: number | string;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;

  requirement_types: RequirementType[];
  operators: RequirementOperator[];

  // Domänenspezifische Felder (optional)
  numeric_value?: number;
  numeric_value_min?: number;
  numeric_value_max?: number;
  unit?: string;

  findings?: string[];
  finding_classifications?: string[];
  finding_classification_choices?: string[];

  lab_values?: string[];
  diseases?: string[];
  genders?: string[];

  // Platzhalter für spätere Erweiterungen
  [key: string]: unknown;
}

export interface RequirementSet {
  id?: number | string;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;

  requirement_set_type: RequirementSetType;

  // Referenzen über Namen (analog YAML)
  requirements?: string[];
  links_to_sets?: string[];

  // Platzhalter für spätere Erweiterungen
  [key: string]: unknown;
}

export interface RequirementStoreState {
  // Index nach Name (primär) für schnelle Auflösung
  requirementsByName: Record<string, Requirement>;
  setsByName: Record<string, RequirementSet>;

  // Optionale Indizes nach ID (falls Backend-IDs genutzt werden)
  requirementIds: Record<string | number, string>; // id -> name
  setIds: Record<string | number, string>; // id -> name

  // Metadaten/Status
  knownOperators: Set<RequirementOperator>;
  knownRequirementTypes: Set<RequirementType>;

  loading: boolean;
  error: string | null;

  // Validierungsinfos
  unresolvedSetLinks: Record<string, string[]>; // setName -> fehlende links_to_sets
  unresolvedRequirements: Record<string, string[]>; // setName -> fehlende requirements
}

function toRecord<T extends { name: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const it of items) {
    if (!it?.name) continue;
    out[it.name] = it;
  }
  return out;
}

function arrayify<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export const useRequirementStore = defineStore('requirementStore', {
  state: (): RequirementStoreState => ({
    requirementsByName: {},
    setsByName: {},
    requirementIds: {},
    setIds: {},

    knownOperators: new Set<RequirementOperator>([
      'models_match_all',
      'models_match_any',
      'age_gte',
      'age_lte',
      'numeric_value_within_normal_range',
      'numeric_value_gte',
      'numeric_value_lte',
      'models_match_any_in_timeframe',
    ]),
    knownRequirementTypes: new Set<RequirementType>([
      'patient',
      'patient_finding',
      'patient_examination',
      'patient_lab_value',
      'patient_disease',
    ]),

    loading: false,
    error: null,

    unresolvedSetLinks: {},
    unresolvedRequirements: {},
  }),

  getters: {
    allRequirements(state): Requirement[] {
      return Object.values(state.requirementsByName);
    },
    allRequirementSets(state): RequirementSet[] {
      return Object.values(state.setsByName);
    },
    getRequirementByName: (state) => (name: string): Requirement | undefined =>
      state.requirementsByName[name],
    getRequirementSetByName: (state) => (name: string): RequirementSet | undefined =>
      state.setsByName[name],
    getRequirementById:
      (state) => (id: string | number): Requirement | undefined => {
        const name = state.requirementIds[id];
        return name ? state.requirementsByName[name] : undefined;
      },
    getRequirementSetById:
      (state) => (id: string | number): RequirementSet | undefined => {
        const name = state.setIds[id];
        return name ? state.setsByName[name] : undefined;
      },

    // Tiefenauflösung der Links (Baum/DAG)
    getLinkedSets:
      (state) =>
      (rootName: string): string[] => {
        const visited = new Set<string>();
        const order: string[] = [];

        const dfs = (name: string) => {
          if (visited.has(name)) return;
          visited.add(name);
          const s = state.setsByName[name];
          if (!s) return;
          for (const child of arrayify(s.links_to_sets)) {
            dfs(child);
          }
          order.push(name);
        };

        dfs(rootName);
        return order;
      },

    // Zyklenprüfung (einfach)
    hasCycle:
      (state) =>
      (rootName?: string): boolean => {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const children = (name: string) => arrayify(state.setsByName[name]?.links_to_sets);

        const dfs = (name: string): boolean => {
          if (visiting.has(name)) return true;
          if (visited.has(name)) return false;
          visiting.add(name);
          for (const c of children(name)) {
            if (dfs(c)) return true;
          }
          visiting.delete(name);
          visited.add(name);
          return false;
        };

        if (rootName) return dfs(rootName);

        return Object.keys(state.setsByName).some((n) => dfs(n));
      },
  },

  actions: {
    reset() {
      this.requirementsByName = {};
      this.setsByName = {};
      this.requirementIds = {};
      this.setIds = {};
      this.unresolvedSetLinks = {};
      this.unresolvedRequirements = {};
      this.error = null;
      this.loading = false;
    },

    upsertRequirement(req: Requirement) {
      if (!req?.name) return;
      this.requirementsByName[req.name] = {
        ...this.requirementsByName[req.name],
        ...req,
        requirement_types: arrayify(req.requirement_types),
        operators: arrayify(req.operators),
      };
      if (req.id !== undefined) this.requirementIds[req.id] = req.name;

      // Kataloge aktualisieren
      for (const t of arrayify(req.requirement_types)) this.knownRequirementTypes.add(t);
      for (const op of arrayify(req.operators)) this.knownOperators.add(op);
    },

    upsertRequirements(reqs: Requirement[]) {
      for (const r of reqs) this.upsertRequirement(r);
      // Nach Upsert: Links-Validierung erneut durchführen
      this._revalidateLinks();
    },

    removeRequirementByName(name: string) {
      // IDs säubern
      for (const [id, n] of Object.entries(this.requirementIds)) {
        if (n === name) delete this.requirementIds[id as unknown as number];
      }
      delete this.requirementsByName[name];
      this._revalidateLinks();
    },

    upsertRequirementSet(set: RequirementSet) {
      if (!set?.name) return;
      this.setsByName[set.name] = {
        ...this.setsByName[set.name],
        ...set,
        requirements: arrayify(set.requirements),
        links_to_sets: arrayify(set.links_to_sets),
      };
      if (set.id !== undefined) this.setIds[set.id] = set.name;
      this._revalidateLinksForSet(set.name);
    },

    upsertRequirementSets(sets: RequirementSet[]) {
      for (const s of sets) this.upsertRequirementSet(s);
      this._revalidateLinks();
    },

    removeRequirementSetByName(name: string) {
      for (const [id, n] of Object.entries(this.setIds)) {
        if (n === name) delete this.setIds[id as unknown as number];
      }
      delete this.setsByName[name];
      delete this.unresolvedSetLinks[name];
      delete this.unresolvedRequirements[name];
      this._revalidateLinks();
    },

    // YAML-Lader (optional: js-yaml verwenden, falls verfügbar)
    loadFromYamlStrings(opts: {
      requirementsYaml?: string;
      requirementSetsYaml?: string;
    }) {
      const { requirementsYaml, requirementSetsYaml } = opts;
      // Lazy import, damit diese Datei auch ohne js-yaml gebaut wird
      const parseYaml = (txt: string) => {
        // @ts-ignore
        const yaml = (window as any)?.jsyaml || undefined;
        if (yaml?.load) return yaml.load(txt);
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('jsimport { defineStore } from 'pinia';

// Domain-Typen (erweiterbar)
export type RequirementType =
  | 'patient'
  | 'patient_finding'
  | 'patient_examination'
  | 'patient_lab_value'
  | 'patient_disease';

export type RequirementOperator =
  | 'models_match_all'
  | 'models_match_any'
  | 'age_gte'
  | 'age_lte'
  | 'numeric_value_within_normal_range'
  | 'numeric_value_gte'
  | 'numeric_value_lte'
  | 'models_match_any_in_timeframe'
  | (string & {}); // Erweiterungen erlauben

export type RequirementSetType =
  | 'all'
  | 'any'
  | 'none'
  | 'exactly_1'
  | 'at_least_1'
  | 'at_most_1';

// Requirement gemäß Guide (Felder optional gehalten, um YAML/Backend-Flexibilität zu erlauben)
export interface Requirement {
  id?: number | string;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;

  requirement_types: RequirementType[];
  operators: RequirementOperator[];

  // Domänenspezifische Felder (optional)
  numeric_value?: number;
  numeric_value_min?: number;
  numeric_value_max?: number;
  unit?: string;

  findings?: string[];
  finding_classifications?: string[];
  finding_classification_choices?: string[];

  lab_values?: string[];
  diseases?: string[];
  genders?: string[];

  // Platzhalter für spätere Erweiterungen
  [key: string]: unknown;
}

export interface RequirementSet {
  id?: number | string;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;

  requirement_set_type: RequirementSetType;

  // Referenzen über Namen (analog YAML)
  requirements?: string[];
  links_to_sets?: string[];

  // Platzhalter für spätere Erweiterungen
  [key: string]: unknown;
}

export interface RequirementStoreState {
  // Index nach Name (primär) für schnelle Auflösung
  requirementsByName: Record<string, Requirement>;
  setsByName: Record<string, RequirementSet>;

  // Optionale Indizes nach ID (falls Backend-IDs genutzt werden)
  requirementIds: Record<string | number, string>; // id -> name
  setIds: Record<string | number, string>; // id -> name

  // Metadaten/Status
  knownOperators: Set<RequirementOperator>;
  knownRequirementTypes: Set<RequirementType>;

  loading: boolean;
  error: string | null;

  // Validierungsinfos
  unresolvedSetLinks: Record<string, string[]>; // setName -> fehlende links_to_sets
  unresolvedRequirements: Record<string, string[]>; // setName -> fehlende requirements
}

function toRecord<T extends { name: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const it of items) {
    if (!it?.name) continue;
    out[it.name] = it;
  }
  return out;
}

function arrayify<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export const useRequirementStore = defineStore('requirementStore', {
  state: (): RequirementStoreState => ({
    requirementsByName: {},
    setsByName: {},
    requirementIds: {},
    setIds: {},

    knownOperators: new Set<RequirementOperator>([
      'models_match_all',
      'models_match_any',
      'age_gte',
      'age_lte',
      'numeric_value_within_normal_range',
      'numeric_value_gte',
      'numeric_value_lte',
      'models_match_any_in_timeframe',
    ]),
    knownRequirementTypes: new Set<RequirementType>([
      'patient',
      'patient_finding',
      'patient_examination',
      'patient_lab_value',
      'patient_disease',
    ]),

    loading: false,
    error: null,

    unresolvedSetLinks: {},
    unresolvedRequirements: {},
  }),

  getters: {
    allRequirements(state): Requirement[] {
      return Object.values(state.requirementsByName);
    },
    allRequirementSets(state): RequirementSet[] {
      return Object.values(state.setsByName);
    },
    getRequirementByName: (state) => (name: string): Requirement | undefined =>
      state.requirementsByName[name],
    getRequirementSetByName: (state) => (name: string): RequirementSet | undefined =>
      state.setsByName[name],
    getRequirementById:
      (state) => (id: string | number): Requirement | undefined => {
        const name = state.requirementIds[id];
        return name ? state.requirementsByName[name] : undefined;
      },
    getRequirementSetById:
      (state) => (id: string | number): RequirementSet | undefined => {
        const name = state.setIds[id];
        return name ? state.setsByName[name] : undefined;
      },

    // Tiefenauflösung der Links (Baum/DAG)
    getLinkedSets:
      (state) =>
      (rootName: string): string[] => {
        const visited = new Set<string>();
        const order: string[] = [];

        const dfs = (name: string) => {
          if (visited.has(name)) return;
          visited.add(name);
          const s = state.setsByName[name];
          if (!s) return;
          for (const child of arrayify(s.links_to_sets)) {
            dfs(child);
          }
          order.push(name);
        };

        dfs(rootName);
        return order;
      },

    // Zyklenprüfung (einfach)
    hasCycle:
      (state) =>
      (rootName?: string): boolean => {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const children = (name: string) => arrayify(state.setsByName[name]?.links_to_sets);

        const dfs = (name: string): boolean => {
          if (visiting.has(name)) return true;
          if (visited.has(name)) return false;
          visiting.add(name);
          for (const c of children(name)) {
            if (dfs(c)) return true;
          }
          visiting.delete(name);
          visited.add(name);
          return false;
        };

        if (rootName) return dfs(rootName);

        return Object.keys(state.setsByName).some((n) => dfs(n));
      },
  },

  actions: {
    reset() {
      this.requirementsByName = {};
      this.setsByName = {};
      this.requirementIds = {};
      this.setIds = {};
      this.unresolvedSetLinks = {};
      this.unresolvedRequirements = {};
      this.error = null;
      this.loading = false;
    },

    upsertRequirement(req: Requirement) {
      if (!req?.name) return;
      this.requirementsByName[req.name] = {
        ...this.requirementsByName[req.name],
        ...req,
        requirement_types: arrayify(req.requirement_types),
        operators: arrayify(req.operators),
      };
      if (req.id !== undefined) this.requirementIds[req.id] = req.name;

      // Kataloge aktualisieren
      for (const t of arrayify(req.requirement_types)) this.knownRequirementTypes.add(t);
      for (const op of arrayify(req.operators)) this.knownOperators.add(op);
    },

    upsertRequirements(reqs: Requirement[]) {
      for (const r of reqs) this.upsertRequirement(r);
      // Nach Upsert: Links-Validierung erneut durchführen
      this._revalidateLinks();
    },

    removeRequirementByName(name: string) {
      // IDs säubern
      for (const [id, n] of Object.entries(this.requirementIds)) {
        if (n === name) delete this.requirementIds[id as unknown as number];
      }
      delete this.requirementsByName[name];
      this._revalidateLinks();
    },

    upsertRequirementSet(set: RequirementSet) {
      if (!set?.name) return;
      this.setsByName[set.name] = {
        ...this.setsByName[set.name],
        ...set,
        requirements: arrayify(set.requirements),
        links_to_sets: arrayify(set.links_to_sets),
      };
      if (set.id !== undefined) this.setIds[set.id] = set.name;
      this._revalidateLinksForSet(set.name);
    },

    upsertRequirementSets(sets: RequirementSet[]) {
      for (const s of sets) this.upsertRequirementSet(s);
      this._revalidateLinks();
    },

    removeRequirementSetByName(name: string) {
      for (const [id, n] of Object.entries(this.setIds)) {
        if (n === name) delete this.setIds[id as unknown as number];
      }
      delete this.setsByName[name];
      delete this.unresolvedSetLinks[name];
      delete this.unresolvedRequirements[name];
      this._revalidateLinks();
    },

    // YAML-Lader (optional: js-yaml verwenden, falls verfügbar)
    loadFromYamlStrings(opts: {
      requirementsYaml?: string;
      requirementSetsYaml?: string;
    }) {
      const { requirementsYaml, requirementSetsYaml } = opts;
      // Lazy import, damit diese Datei auch ohne js-yaml gebaut wird
      const parseYaml = (txt: string) => {
        // @ts-ignore
        const yaml = (window as any)?.jsyaml || undefined;
        if (yaml?.load) return yaml.load(txt);
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = require('js-yaml');
          return mod.load(txt);
        } catch {
          throw new Error('js-yaml ist nicht verfügbar. Bitte installieren: npm i js-yaml');
        }
      };

      if (requirementsYaml) {
        const doc = parseYaml(requirementsYaml);
        const list: Requirement[] = Array.isArray(doc) ? doc.map((d) => d?.fields || d) : [];
        // Nur Einträge mit name aufnehmen
        this.upsertRequirements(
          list.filter((r) => r && typeof r.name === 'string') as Requirement[],
        );
      }

      if (requirementSetsYaml) {
        const doc = parseYaml(requirementSetsYaml);
        const list: RequirementSet[] = Array.isArray(doc) ? doc.map((d) => d?.fields || d) : [];
        this.upsertRequirementSets(
          list.filter((s) => s && typeof s.name === 'string') as RequirementSet[],
        );
      }
    },

    // Validierungs-Helpers
    _revalidateLinks() {
      this.unresolvedSetLinks = {};
      this.unresolvedRequirements = {};
      for (const name of Object.keys(this.setsByName)) {
        this._revalidateLinksForSet(name);
      }
    },

    _revalidateLinksForSet(setName: string) {
      const set = this.setsByName[setName];
      if (!set) return;

      // fehlende Set-Links
      const missingSets: string[] = [];
      for (const child of arrayify(set.links_to_sets)) {
        if (!this.setsByName[child]) missingSets.push(child);
      }
      if (missingSets.length) this.unresolvedSetLinks[setName] = missingSets;
      else delete this.unresolvedSetLinks[setName];

      // fehlende Requirements
      const missingReqs: string[] = [];
      for (const reqName of arrayify(set.requirements)) {
        if (!this.requirementsByName[reqName]) missingReqs.push(reqName);
      }
      if (missingReqs.length) this.unresolvedRequirements[setName] = missingReqs;
      else delete this.unresolvedRequirements[setName];
    },
  },
});-yaml');
          return mod.load(txt);
        } catch {
          throw new Error('js-yaml ist nicht verfügbar. Bitte installieren: npm i js-yaml');
        }
      };

      if (requirementsYaml) {
        const doc = parseYaml(requirementsYaml);
        const list: Requirement[] = Array.isArray(doc) ? doc.map((d) => d?.fields || d) : [];
        // Nur Einträge mit name aufnehmen
        this.upsertRequirements(
          list.filter((r) => r && typeof r.name === 'string') as Requirement[],
        );
      }

      if (requirementSetsYaml) {
        const doc = parseYaml(requirementSetsYaml);
        const list: RequirementSet[] = Array.isArray(doc) ? doc.map((d) => d?.fields || d) : [];
        this.upsertRequirementSets(
          list.filter((s) => s && typeof s.name === 'string') as RequirementSet[],
        );
      }
    },

    // Validierungs-Helpers
    _revalidateLinks() {
      this.unresolvedSetLinks = {};
      this.unresolvedRequirements = {};
      for (const name of Object.keys(this.setsByName)) {
        this._revalidateLinksForSet(name);
      }
    },

    _revalidateLinksForSet(setName: string) {
      const set = this.setsByName[setName];
      if (!set) return;

      // fehlende Set-Links
      const missingSets: string[] = [];
      for (const child of arrayify(set.links_to_sets)) {
        if (!this.setsByName[child]) missingSets.push(child);
      }
      if (missingSets.length) this.unresolvedSetLinks[setName] = missingSets;
      else delete this.unresolvedSetLinks[setName];

      // fehlende Requirements
      const missingReqs: string[] = [];
      for (const reqName of arrayify(set.requirements)) {
        if (!this.requirementsByName[reqName]) missingReqs.push(reqName);
      }
      if (missingReqs.length) this.unresolvedRequirements[setName] = missingReqs;
      else delete this.unresolvedRequirements[setName];
    },
  },
});