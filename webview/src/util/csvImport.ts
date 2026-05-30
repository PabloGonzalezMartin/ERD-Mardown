import { Table, Column, DictionaryEntry, DbType, DB_TYPES, Relation, CardinalityEnd } from '@shared/DiagramModel';
import { genId } from './idgen';

export type CsvImportCategory = 'table' | 'dictionary';

export interface BuiltinPreset {
  name: string;
  dbType: DbType;
  length: number | null;
  notNull: boolean;
  comment: string;
}

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  { name: 'ID',         dbType: 'INT',      length: null, notNull: true,  comment: 'Surrogate primary key' },
  { name: 'BigID',      dbType: 'BIGINT',   length: null, notNull: true,  comment: 'Large surrogate key' },
  { name: 'Name',       dbType: 'VARCHAR',  length: 100,  notNull: true,  comment: 'Short name / label' },
  { name: 'Title',      dbType: 'VARCHAR',  length: 255,  notNull: true,  comment: 'Title or longer name' },
  { name: 'Email',      dbType: 'VARCHAR',  length: 255,  notNull: true,  comment: 'Email address' },
  { name: 'Code',       dbType: 'VARCHAR',  length: 20,   notNull: true,  comment: 'Short code / slug' },
  { name: 'Text',       dbType: 'TEXT',     length: null, notNull: false, comment: 'Long text' },
  { name: 'Flag',       dbType: 'TINYINT',  length: 1,    notNull: true,  comment: 'Boolean flag (0/1)' },
  { name: 'Quantity',   dbType: 'INT',      length: null, notNull: true,  comment: 'Integer quantity' },
  { name: 'Amount',     dbType: 'DECIMAL',  length: 10,   notNull: true,  comment: 'Monetary amount' },
  { name: 'Timestamp',  dbType: 'DATETIME', length: null, notNull: true,  comment: 'Created/updated timestamp' },
  { name: 'Date',       dbType: 'DATE',     length: null, notNull: true,  comment: 'Calendar date' },
  { name: 'JSON',       dbType: 'JSON',     length: null, notNull: false, comment: 'Arbitrary JSON payload' },
  { name: 'NullableID', dbType: 'INT',      length: null, notNull: false, comment: 'Nullable foreign key' },
];

// Unified CSV — table + column columns first, then optional relation + note columns
export const TABLE_CSV_HEADERS =
  'tableLogicalName,tablePhysicalName,tableComment,columnLogicalName,columnPhysicalName,' +
  'dictionaryName,dbType,length,notNull,isPrimaryKey,isNullable,defaultValue,columnComment,' +
  'columnDesignNote,tableDesignNote,tableStatus,columnStatus,' +
  'relFromTable,relFromColumn,relToTable,relToColumn,relCardinality,relIdentifying,relHasFk,relConstraint,relComment';

export const TABLE_CSV_EXAMPLE =
`User,users,User accounts,User ID,user_id,ID,,,,,false,,,,,,,,,,,,,
User,users,,Name,name,Name,,,,,true,,,,,,,,,,,,,
Order,orders,,Order ID,order_id,ID,,,,,false,,,,,,,,,,,,,
Order,orders,,User ID,user_id,NullableID,,,,,false,,,,,,,,,,,,,
,,,,,,,,,,,,,,,User,user_id,Order,user_id,ONE_TO_MANY,true,true,fk_orders_user,,`;

export const DICTIONARY_CSV_HEADERS = 'name,dbType,length,notNull,comment';

export const DICTIONARY_CSV_EXAMPLE = `User ID,INT,,true,Primary key type
Name,VARCHAR,255,true,Display name
Amount,DECIMAL,10,true,Monetary amount`;

export interface ParsedTableImport {
  tables: Table[];
  relations: Relation[];
  autoCreatedDictEntries: DictionaryEntry[];
  skippedTableNames: string[];
  skippedRelationCount: number;
}

export interface ParsedDictionaryImport {
  entries: DictionaryEntry[];
  skippedNames: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

function toValidDbType(raw: string): DbType {
  const upper = raw?.toUpperCase() as DbType;
  return DB_TYPES.includes(upper) ? upper : 'VARCHAR';
}

function toCardinality(raw: string): { from: CardinalityEnd; to: CardinalityEnd } {
  switch (raw?.toUpperCase().replace(/[-_ ]/g, '')) {
    case 'ONETOONE':    return { from: 'EXACTLY_ONE',  to: 'EXACTLY_ONE' };
    case 'ONETOMANY':   return { from: 'EXACTLY_ONE',  to: 'ZERO_OR_MANY' };
    case 'MANYTOONE':   return { from: 'ZERO_OR_MANY', to: 'EXACTLY_ONE' };
    case 'MANYTOMANY':  return { from: 'ZERO_OR_MANY', to: 'ZERO_OR_MANY' };
    case 'ZEROORONE':   return { from: 'EXACTLY_ONE',  to: 'ZERO_OR_ONE' };
    default:            return { from: 'EXACTLY_ONE',  to: 'ZERO_OR_MANY' };
  }
}

export function parseDictionaryCsv(
  csv: string,
  existingDictionary: DictionaryEntry[]
): ParsedDictionaryImport {
  const rows = parseCsvRows(csv);
  const existingNames = new Set(existingDictionary.map((e) => e.name.toLowerCase()));
  const skippedNames: string[] = [];
  const entries: DictionaryEntry[] = [];

  for (const row of rows) {
    const name = row.name ?? '';
    if (!name) continue;
    if (existingNames.has(name.toLowerCase())) { skippedNames.push(name); continue; }
    existingNames.add(name.toLowerCase());
    entries.push({
      id: genId('dict'), name,
      dbType: toValidDbType(row.dbType ?? ''),
      length: row.length ? parseInt(row.length, 10) : null,
      notNull: row.notNull?.toLowerCase() === 'true',
      comment: row.comment ?? '',
    });
  }
  return { entries, skippedNames };
}

export function parseTableCsv(
  csv: string,
  existingDictionary: DictionaryEntry[],
  existingTablePhysicalNames: Set<string>,
  existingRelations: Relation[] = [],
  existingTables: Table[] = [],
): ParsedTableImport {
  const rows = parseCsvRows(csv);

  const newDictMap = new Map<string, DictionaryEntry>();
  const allDict = [...existingDictionary];

  function findOrCreateByName(dictName: string): string | null {
    const lower = dictName.toLowerCase();
    const found = allDict.find((e) => e.name.toLowerCase() === lower);
    if (found) return found.id;
    const preset = BUILTIN_PRESETS.find((p) => p.name.toLowerCase() === lower);
    if (!preset) return null;
    if (newDictMap.has(preset.name)) return newDictMap.get(preset.name)!.id;
    const entry: DictionaryEntry = { id: genId('dict'), name: preset.name, dbType: preset.dbType, length: preset.length, notNull: preset.notNull, comment: preset.comment };
    newDictMap.set(preset.name, entry);
    allDict.push(entry);
    return entry.id;
  }

  function findOrCreateByType(dbTypeRaw: string, lengthRaw: string, notNullRaw: string): string {
    const dt = toValidDbType(dbTypeRaw);
    const len = lengthRaw ? parseInt(lengthRaw, 10) : null;
    const nn = notNullRaw?.toLowerCase() === 'true';
    const found = allDict.find((e) => e.dbType === dt && e.length === len && e.notNull === nn);
    if (found) return found.id;
    const key = `${dt}:${len}:${nn}`;
    if (newDictMap.has(key)) return newDictMap.get(key)!.id;
    const entry: DictionaryEntry = { id: genId('dict'), name: dt + (len != null ? `(${len})` : '') + (nn ? '' : ' NULL'), dbType: dt, length: len, notNull: nn, comment: '' };
    newDictMap.set(key, entry);
    allDict.push(entry);
    return entry.id;
  }

  const tableMap     = new Map<string, Table>();   // physicalName → Table (new + existing)
  const tableOrder: string[] = [];                  // only newly imported tables
  const skippedTableNames: string[] = [];
  const relations: Relation[] = [];
  let skippedRelationCount = 0;

  // Seed tableMap with existing tables so relation rows can resolve them by physicalName
  for (const t of existingTables) {
    tableMap.set(t.physicalName, t);
  }

  // Dedup relations by fromTable+fromCol+toTable+toCol
  const relKeys = new Set(existingRelations.map((r) => {
    const ft = r.fromTableId; const fc = r.fromColumnId;
    const tt = r.toTableId;   const tc = r.toColumnId;
    return `${ft}|${fc}|${tt}|${tc}`;
  }));

  for (const row of rows) {
    // ── Table + column row ────────────────────────────────────────
    const tablePhysical = row.tablePhysicalName?.trim() ?? '';
    const colPhysical   = row.columnPhysicalName?.trim() ?? '';

    if (tablePhysical && colPhysical) {
      if (existingTablePhysicalNames.has(tablePhysical)) {
        if (!skippedTableNames.includes(tablePhysical)) skippedTableNames.push(tablePhysical);
      } else {
        if (!tableMap.has(tablePhysical)) {
          tableOrder.push(tablePhysical);
          const rawTableStatus = row.tableStatus?.trim().toLowerCase();
          tableMap.set(tablePhysical, {
            id: genId('tbl'),
            logicalName:  row.tableLogicalName || tablePhysical,
            physicalName: tablePhysical,
            comment:      row.tableComment ?? '',
            designNote:   row.tableDesignNote?.trim() || undefined,
            status: (rawTableStatus === 'planned' || rawTableStatus === 'proposed') ? rawTableStatus : 'implemented',
            columns: [],
          });
        }
        const table = tableMap.get(tablePhysical)!;

        // Update tableDesignNote if provided on any row for this table
        if (row.tableDesignNote?.trim() && !table.designNote) {
          table.designNote = row.tableDesignNote.trim();
        }

        const dictName = row.dictionaryName?.trim() ?? '';
        const dictionaryId = dictName
          ? (findOrCreateByName(dictName) ?? findOrCreateByType(row.dbType ?? '', row.length ?? '', row.notNull ?? 'false'))
          : findOrCreateByType(row.dbType ?? '', row.length ?? '', row.notNull ?? 'false');

        const rawColStatus = row.columnStatus?.trim().toLowerCase();
        const col: Column = {
          id:           genId('col'),
          logicalName:  row.columnLogicalName || colPhysical,
          physicalName: colPhysical,
          dictionaryId,
          isPrimaryKey: row.isPrimaryKey?.toLowerCase() === 'true',
          isNullable:   row.isNullable?.toLowerCase() !== 'false',
          defaultValue: row.defaultValue || null,
          comment:      row.columnComment ?? row.comment ?? '',
          designNote:   row.columnDesignNote?.trim() || undefined,
          status: (rawColStatus === 'planned' || rawColStatus === 'proposed') ? rawColStatus : undefined,
        };
        table.columns.push(col);
      }
    }

    // ── Relation row ──────────────────────────────────────────────
    const fromTablePhys = row.relFromTable?.trim() ?? '';
    const fromColPhys   = row.relFromColumn?.trim() ?? '';
    const toTablePhys   = row.relToTable?.trim() ?? '';
    const toColPhys     = row.relToColumn?.trim() ?? '';

    if (fromTablePhys && toTablePhys) {
      // Resolve table IDs — look in newly imported tables first, then existing
      const fromTable = tableMap.get(fromTablePhys);
      const toTable   = tableMap.get(toTablePhys);

      // We'll do a second pass after parsing to resolve IDs — store raw for now
      // but we need the table+col IDs. If table not in this import, skip.
      if (fromTable && toTable) {
        const fromCol = fromColPhys ? fromTable.columns.find((c) => c.physicalName === fromColPhys) : undefined;
        const toCol   = toColPhys   ? toTable.columns.find((c) => c.physicalName === toColPhys)     : undefined;

        const fromTableId  = fromTable.id;
        const fromColumnId = fromCol?.id ?? '';
        const toTableId    = toTable.id;
        const toColumnId   = toCol?.id ?? '';

        const relKey = `${fromTableId}|${fromColumnId}|${toTableId}|${toColumnId}`;
        if (relKeys.has(relKey)) {
          skippedRelationCount++;
        } else {
          relKeys.add(relKey);
          const card = toCardinality(row.relCardinality ?? '');
          relations.push({
            id:              genId('rel'),
            fromTableId,
            fromColumnId,
            toTableId,
            toColumnId,
            fromCardinality: card.from,
            toCardinality:   card.to,
            identifying:     row.relIdentifying?.toLowerCase() !== 'false',
            hasForeignKey:   row.relHasFk?.toLowerCase() === 'true',
            constraintName:  row.relConstraint?.trim() ?? '',
            comment:         row.relComment?.trim() ?? '',
          });
        }
      } else {
        skippedRelationCount++;
      }
    }
  }

  return {
    tables:                tableOrder.map((p) => tableMap.get(p)!),
    relations,
    autoCreatedDictEntries: Array.from(newDictMap.values()),
    skippedTableNames,
    skippedRelationCount,
  };
}
