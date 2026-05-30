# ER Diagram CSV Generator Prompt

Use this prompt with any AI assistant (ChatGPT, Claude, Gemini, etc.) to generate a CSV file ready to import into the ER Diagram tool.

---

## How to use

1. Copy the prompt below
2. Fill in the `[USER INPUT]` sections with your domain/language/requirements
3. Paste into your AI assistant
4. Copy the CSV result and import it via **Import CSV** in the sidebar

---

## Prompt

```
You are a database schema designer. I need you to generate a CSV file describing an ER diagram that can be imported into a diagramming tool.

---

## MY DOMAIN / CONTEXT

[USER INPUT — Describe your system in plain language. Examples:
  - "An e-commerce platform with products, customers, orders and reviews"
  - "A hospital management system with patients, doctors, appointments and prescriptions"
  - "A school platform with students, courses, teachers, grades and attendance"
  - "Un sistema de gestión de energía renovable con plantas, medidores, lecturas y alertas"
  - "Ein Bibliothekssystem mit Büchern, Autoren, Mitgliedern und Ausleihen"
  You can write this in any language — the output will always be in the CSV format below.]

---

## EXISTING MODELS / TERMINOLOGY TO FOLLOW

[USER INPUT — Optional. Paste any existing table names, field names, or naming conventions you already use.
  Examples:
  - "Table names must be in snake_case. Use 'tbl_' prefix."
  - "Column names follow camelCase."
  - "Primary keys are always named 'id' of type INT."
  - "Existing tables: usuarios, pedidos, productos. Keep these exact names."
  Leave blank if you have no existing conventions.]

---

## REQUIREMENTS

Generate a complete ER diagram CSV with the following characteristics:

### Tables & Columns
- Include ALL tables needed for the domain described above
- Each table must have a clear logical name (human readable) and physical name (DB identifier)
- Every table must have a table-level comment explaining its purpose
- Every column must have a comment explaining what it stores
- Mark primary key columns with isPrimaryKey=true
- Use appropriate dbType for each column: INT, BIGINT, VARCHAR, TEXT, DATETIME, DATE, DECIMAL, TINYINT, BOOLEAN, JSON
- Set appropriate length for VARCHAR columns (e.g. 255 for names, 100 for short strings, 20 for codes)
- Set notNull=true for required fields, false for optional ones
- Set isNullable=false for required fields, true for optional ones

### Implementation Status
Every table and column must have a realistic status:
- Use 'implemented' for core, stable entities and their main columns
- Use 'planned' for features that are designed but not yet built (e.g. analytics tables, audit logs)
- Use 'proposed' for experimental or under-discussion items (e.g. future integrations, optional extensions)
- Set tableDesignNote for tables that are 'planned' or 'proposed' explaining the rationale
- Set columnDesignNote for columns that are 'planned' or 'proposed'

### Relations
- Define ALL foreign key relationships between tables
- For each relation set relFromTable, relFromColumn, relToTable, relToColumn
- relCardinality: use ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, or MANY_TO_MANY
- relIdentifying: use 'true' for SOLID lines (child cannot exist without parent, e.g. order_item needs order)
- relIdentifying: use 'false' for DASHED lines (child can exist independently, e.g. user can exist without orders)
- relHasFk: use 'true' when the relation should generate a FOREIGN KEY constraint in the DDL
- relConstraint: provide a descriptive FK constraint name (e.g. fk_orders_user_id)
- relComment: explain the business rule behind this relation in one sentence

### Design Notes
- Add tableDesignNote to all tables explaining design decisions, trade-offs or open questions
- Add columnDesignNote to any column where the choice of type, nullability or naming needs explanation

---

## OUTPUT FORMAT

Return ONLY the CSV content, nothing else — no explanation, no markdown fences, no preamble.

The CSV must use exactly this header row (copy it verbatim as the first line):

tableLogicalName,tablePhysicalName,tableComment,columnLogicalName,columnPhysicalName,dictionaryName,dbType,length,notNull,isPrimaryKey,isNullable,defaultValue,columnComment,columnDesignNote,tableDesignNote,relFromTable,relFromColumn,relToTable,relToColumn,relCardinality,relIdentifying,relHasFk,relConstraint,relComment

### Column descriptions

| Column | Required | Description |
|---|---|---|
| tableLogicalName | Yes (table rows) | Human-readable table name (e.g. "Shopping Basket") |
| tablePhysicalName | Yes (table rows) | DB table name in snake_case (e.g. "shopping_baskets") |
| tableComment | No | One-sentence description of the table's purpose |
| columnLogicalName | Yes (table rows) | Human-readable column name |
| columnPhysicalName | Yes (table rows) | DB column name in snake_case |
| dictionaryName | No | Leave blank — the tool resolves types from dbType/length |
| dbType | Yes (table rows) | SQL type: INT, BIGINT, VARCHAR, TEXT, DATETIME, DATE, DECIMAL, TINYINT, BOOLEAN, JSON |
| length | No | Numeric length for VARCHAR/DECIMAL (e.g. 255). Leave blank for others. |
| notNull | No | true = NOT NULL constraint. false = nullable. |
| isPrimaryKey | No | true if this column is a primary key (or part of a composite PK) |
| isNullable | No | false = required field. true = optional. |
| defaultValue | No | SQL default expression (e.g. CURRENT_TIMESTAMP, 0, NULL). Leave blank for none. |
| columnComment | No | One-sentence description of what this column stores |
| columnDesignNote | No | Design rationale, open questions, or implementation notes for this column |
| tableDesignNote | No | Design rationale for the whole table (only needed on the first row of each table) |
| relFromTable | No (relation rows) | Physical name of the source table |
| relFromColumn | No (relation rows) | Physical name of the source column (usually the PK) |
| relToTable | No (relation rows) | Physical name of the target table |
| relToColumn | No (relation rows) | Physical name of the target column (the FK column) |
| relCardinality | No (relation rows) | ONE_TO_ONE / ONE_TO_MANY / MANY_TO_ONE / MANY_TO_MANY |
| relIdentifying | No (relation rows) | true = solid line (identifying). false = dashed line (non-identifying). |
| relHasFk | No (relation rows) | true = generate FOREIGN KEY constraint in DDL |
| relConstraint | No (relation rows) | FK constraint name (e.g. fk_orders_user_id) |
| relComment | No (relation rows) | One sentence explaining the business rule of this relation |

### Row types

A row can be:
1. **Table+column row** — fill tableLogicalName, tablePhysicalName, column fields. Leave rel* columns blank.
2. **Relation row** — fill only rel* columns. Leave all table/column fields blank.
3. Both in the same row is allowed but not recommended for clarity.

### Example (3 tables + 2 relations)

tableLogicalName,tablePhysicalName,tableComment,columnLogicalName,columnPhysicalName,dictionaryName,dbType,length,notNull,isPrimaryKey,isNullable,defaultValue,columnComment,columnDesignNote,tableDesignNote,relFromTable,relFromColumn,relToTable,relToColumn,relCardinality,relIdentifying,relHasFk,relConstraint,relComment
User,users,Registered users,ID,id,,INT,,true,true,false,,Surrogate primary key,,,,,,,,,,,
User,users,,Name,name,,VARCHAR,100,true,false,false,,Full display name,,,,,,,,,,,
User,users,,Email,email,,VARCHAR,255,true,false,false,,Unique email address,,,,,,,,,,,
Order,orders,Customer purchase orders,ID,id,,INT,,true,true,false,,Surrogate primary key,,Orders are created when checkout completes,,,,,,,,,,
Order,orders,,User ID,user_id,,INT,,true,false,false,,FK to the user who placed this order,,,,,,,,,,,
Order,orders,,Total,total,,DECIMAL,10,true,false,false,0.00,Order total in base currency,,,,,,,,,,,
Order,orders,,Created At,created_at,,DATETIME,,true,false,false,CURRENT_TIMESTAMP,Timestamp when order was placed,,,,,,,,,,,
Order Item,order_items,Individual line items within an order,ID,id,,INT,,true,true,false,,Surrogate primary key,,Planned: add discount_amount column in next sprint,,,,,,,,,,,
Order Item,order_items,,Order ID,order_id,,INT,,true,false,false,,FK to parent order,,,,,,,,,,,
Order Item,order_items,,Product ID,product_id,,INT,,true,false,false,,FK to product,,,,,,,,,,,
Order Item,order_items,,Quantity,quantity,,INT,,true,false,false,1,Number of units,,,,,,,,,,,,
,,,,,,,,,,,,,,,users,id,orders,user_id,ONE_TO_MANY,false,true,fk_orders_user_id,Non-identifying: a user can exist without any orders
,,,,,,,,,,,,,,,orders,id,order_items,order_id,ONE_TO_MANY,true,true,fk_order_items_order_id,Identifying: an order item cannot exist without its parent order

---

Now generate the full CSV for my domain described above. Return ONLY the CSV — no explanation, no markdown, no code blocks.
```

---

## Tips

- **If the result is cut off** — ask the AI: *"Continue the CSV from where you left off"*
- **If you want more tables** — add to the context section: *"Also include audit logs, notifications, and user preferences"*
- **If names are in the wrong language** — specify: *"All logical names in Spanish, all physical names in English snake_case"*
- **If you want only a subset** — specify: *"Only generate the core tables, mark everything else as 'proposed'"*
- **To regenerate relations only** — ask: *"Using the same tables, regenerate only the relation rows"*
