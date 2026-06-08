export type DbType =
  | 'INT' | 'BIGINT' | 'SMALLINT' | 'TINYINT'
  | 'VARCHAR' | 'CHAR' | 'TEXT' | 'LONGTEXT'
  | 'DATETIME' | 'DATE' | 'TIMESTAMP' | 'TIME'
  | 'DECIMAL' | 'FLOAT' | 'DOUBLE'
  | 'BOOLEAN' | 'JSON' | 'BLOB';

export const DB_TYPES: DbType[] = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT',
  'DATETIME', 'DATE', 'TIMESTAMP', 'TIME',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'BOOLEAN', 'JSON', 'BLOB',
];

export interface DictionaryEntry {
  id: string;
  name: string;
  dbType: DbType;
  length: number | null;
  notNull: boolean;
  comment: string;
  category?: string;
}

export type ImplementationStatus = 'implemented' | 'planned' | 'proposed';

export interface Column {
  id: string;
  logicalName: string;
  physicalName: string;
  dictionaryId: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  defaultValue: string | null;
  comment: string;
  designNote?: string;
  status?: ImplementationStatus;
}

export interface TableIndex {
  id: string;
  name: string;
  columns: string[];
  unique: boolean;
  comment?: string;
}

export type ConstraintType = 'UNIQUE' | 'CHECK' | 'CUSTOM';

export interface TableConstraint {
  id: string;
  type: ConstraintType;
  name: string;
  expression: string;
  comment?: string;
}

export interface Table {
  id: string;
  logicalName: string;
  physicalName: string;
  comment: string;
  designNote?: string;
  headerColor?: string;
  status?: ImplementationStatus;
  columns: Column[];
  indexes?: TableIndex[];
  constraints?: TableConstraint[];
  seedData?: Record<string, string>[];
}

// Legacy — kept for back-compat parsing only
export type Cardinality = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';

export type CardinalityEnd =
  | 'ZERO_OR_ONE'   // o|
  | 'EXACTLY_ONE'   // ||
  | 'ZERO_OR_MANY'  // o{
  | 'ONE_OR_MANY';  // |{

export const CARDINALITY_END_LABELS: Record<CardinalityEnd, string> = {
  ZERO_OR_ONE:  '0..1',
  EXACTLY_ONE:  '1',
  ZERO_OR_MANY: '0..*',
  ONE_OR_MANY:  '1..*',
};

export interface Relation {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  fromCardinality: CardinalityEnd;
  toCardinality: CardinalityEnd;
  identifying: boolean;
  hasForeignKey: boolean;
  constraintName: string;
  comment: string;
  // Legacy field — present in old .ermd files, migrated on parse
  cardinality?: string;
}

export interface TableLayout {
  tableId: string;
  x: number;
  y: number;
  width: number;
}

export interface RegionLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface CommentLayout {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  textColor?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface SchemaVersion {
  id: string;
  name: string;
  date: string;
  tables: Table[];
  relations: Relation[];
  dictionary: DictionaryEntry[];
  layout: {
    nameMode: 'logical' | 'physical';
    tables: TableLayout[];
    regions: RegionLayout[];
    comments?: CommentLayout[];
    viewport: { x: number; y: number; zoom: number };
  };
}

export interface DiagramModel {
  version: number;
  dictionary: DictionaryEntry[];
  tables: Table[];
  relations: Relation[];
  layout: {
    nameMode: 'logical' | 'physical';
    tables: TableLayout[];
    regions: RegionLayout[];
    comments?: CommentLayout[];
    viewport: { x: number; y: number; zoom: number };
  };
  schemaVersions?: SchemaVersion[];
}

export function createEmptyModel(): DiagramModel {
  return {
    version: 1,
    dictionary: [],
    tables: [],
    relations: [],
    layout: {
      nameMode: 'logical',
      tables: [],
      regions: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  };
}

export function migrateCardinality(c: string): { fromCardinality: CardinalityEnd; toCardinality: CardinalityEnd } {
  switch (c) {
    case 'ONE_TO_ONE':   return { fromCardinality: 'EXACTLY_ONE',  toCardinality: 'EXACTLY_ONE' };
    case 'ONE_TO_MANY':  return { fromCardinality: 'EXACTLY_ONE',  toCardinality: 'ZERO_OR_MANY' };
    case 'MANY_TO_MANY': return { fromCardinality: 'ZERO_OR_MANY', toCardinality: 'ZERO_OR_MANY' };
    default:             return { fromCardinality: 'EXACTLY_ONE',  toCardinality: 'ZERO_OR_MANY' };
  }
}
