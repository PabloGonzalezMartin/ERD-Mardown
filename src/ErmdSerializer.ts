import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { DiagramModel } from '../shared/DiagramModel';

// Reorders object keys so that `firstKeys` appear first, rest follow in original order.
function reorder<T extends object>(obj: T, firstKeys: (keyof T)[]): T {
  const result: Partial<T> = {};
  for (const key of firstKeys) {
    if (key in obj) { result[key] = obj[key]; }
  }
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!firstKeys.includes(key)) { result[key] = obj[key]; }
  }
  return result as T;
}

export class ErmdSerializer {
  static serialize(model: DiagramModel, fileUri: vscode.Uri): string {
    const filename = fileUri.path.split('/').pop() ?? 'ER Diagram';
    const title = filename.replace(/\.ermd$/, '');

    const lines: string[] = [];

    lines.push('---');
    lines.push('er-diagram: true');
    lines.push(`version: ${model.version}`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${title}`);

    if (model.dictionary.length > 0) {
      lines.push('');
      lines.push('## Dictionary');
      lines.push('');
      lines.push('```ermd-dictionary');
      const dict = model.dictionary.map((e) => reorder(e, ['name', 'id']));
      lines.push(yaml.dump(dict, { indent: 2, lineWidth: -1 }).trimEnd());
      lines.push('```');
    }

    if (model.tables.length > 0) {
      lines.push('');
      lines.push('## Tables');
      for (const table of model.tables) {
        const ordered = reorder(
          { ...table, columns: table.columns.map((c) => reorder(c, ['physicalName', 'id'])) },
          ['physicalName', 'id'],
        );
        lines.push('');
        lines.push('```ermd-table');
        lines.push(yaml.dump(ordered, { indent: 2, lineWidth: -1 }).trimEnd());
        lines.push('```');
      }
    }

    if (model.relations.length > 0) {
      lines.push('');
      lines.push('## Relations');
      lines.push('');
      lines.push('```ermd-relations');
      const relations = model.relations.map((r) => reorder(r, ['constraintName', 'id']));
      lines.push(yaml.dump(relations, { indent: 2, lineWidth: -1 }).trimEnd());
      lines.push('```');
    }

    lines.push('');
    lines.push('## Layout');
    lines.push('');
    lines.push('```ermd-layout');
    lines.push(yaml.dump(model.layout, { indent: 2, lineWidth: -1 }).trimEnd());
    lines.push('```');

    if (model.schemaVersions && model.schemaVersions.length > 0) {
      lines.push('');
      lines.push('## Versions');
      lines.push('');
      lines.push('```ermd-versions');
      lines.push(yaml.dump(model.schemaVersions, { indent: 2, lineWidth: -1 }).trimEnd());
      lines.push('```');
    }

    return lines.join('\n') + '\n';
  }
}
